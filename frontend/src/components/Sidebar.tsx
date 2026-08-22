'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import api from '../utils/api';

export default function Sidebar() {
  const [githubUrl, setGithubUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingRepos, setIsLoadingRepos] = useState(true);

  // Extract state & setters from Zustand store
  const {
    repositories,
    activeRepoId,
    ingestionProgress,
    setRepositories,
    setActiveRepoId,
    setActiveConversationId,
    setMessages,
  } = useAppStore();

  // Fetch existing repositories
  useEffect(() => {
    async function fetchRepos() {
      try {
        const response = await api.get('/repositories');
        setRepositories(response.data);
      } catch (err) {
        console.error('Failed to populate repositories:', err);
      } finally {
        setIsLoadingRepos(false);
      }
    }
    fetchRepos();
  }, [setRepositories]);

  // Submit ingestion request
  const handleIngestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubUrl.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await api.post('/repositories/ingest', { githubUrl });
      const targetRepo = response.data.repository;

      if (!repositories.some((r) => r.id === targetRepo.id)) {
        setRepositories([...repositories, targetRepo]);
      }

      setActiveRepoId(targetRepo.id);
      setGithubUrl('');
    } catch (err: any) {
      console.error('Network exception:', err);
      const errMsg = err.response?.data?.error || 'Failed to submit code ingestion.';
      alert(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Select repository
  const handleSelectRepository = async (repoId: string) => {
    setActiveRepoId(repoId);
    setMessages([]);
    setActiveConversationId(null);

    try {
      const response = await api.post(`/chat/conversation/${repoId}`);
      setActiveConversationId(response.data.conversationId);
      setMessages(response.data.messages || []);
    } catch (err) {
      console.error('Failed to set active conversation:', err);
    }
  };

  return (
    <aside className="flex flex-col h-full w-64 border-r border-outline-variant bg-surface-container-lowest flex-shrink-0 font-body-md select-none p-5 space-y-6">
      {/* Index Form Section */}
      <div className="space-y-2">
        <form onSubmit={handleIngestSubmit} className="space-y-2">
          <input
            id="repo-ingest-input"
            type="url"
            placeholder="GitHub repository URL..."
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            disabled={isSubmitting}
            className="w-full bg-background border border-outline-variant rounded-[2px] px-3 py-2 text-xs font-code-sm text-on-surface outline-none focus:border-primary placeholder:text-outline-variant disabled:opacity-50"
            required
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary text-background font-code-sm text-xs py-2 px-3 rounded-[2px] hover:bg-primary-fixed transition-colors font-medium border-none cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'Ingesting...' : 'Ingest Repository'}
          </button>
        </form>
      </div>

      {/* Ingestion Progress */}
      {ingestionProgress && (
        <div className="border border-outline-variant bg-surface p-3 rounded-[2px] space-y-2">
          <div className="flex justify-between items-center text-xs font-code-sm">
            <span className="text-primary">{ingestionProgress.status || 'Ingesting'}</span>
            <span className="text-primary">{ingestionProgress.progress}%</span>
          </div>
          <div className="h-1 bg-surface-container-high w-full rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${ingestionProgress.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Codebases List */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
        <div className="text-xs font-code-sm text-outline mb-3">Repositories</div>

        {isLoadingRepos ? (
          <div className="space-y-2">
            <div className="h-8 bg-surface-container-high animate-pulse rounded-[2px]" />
            <div className="h-8 bg-surface-container-high animate-pulse rounded-[2px]" />
          </div>
        ) : repositories.length === 0 ? (
          <p className="text-xs font-code-sm text-on-surface-variant py-2">No codebases indexed.</p>
        ) : (
          repositories.map((repo) => {
            const isActive = repo.id === activeRepoId;
            const isReady = repo.status === 'READY';
            const isFailed = repo.status === 'FAILED';

            return (
              <button
                key={repo.id}
                type="button"
                onClick={() => handleSelectRepository(repo.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-[2px] transition-colors text-left text-xs font-code-sm cursor-pointer ${
                  isActive
                    ? 'bg-surface-container-low border border-outline-variant text-primary font-medium'
                    : 'hover:bg-surface-container text-on-surface-variant border border-transparent'
                }`}
              >
                <span className="truncate">{repo.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-[2px] border border-outline-variant ${
                    isReady
                      ? 'bg-surface-container text-on-surface-variant'
                      : isFailed
                      ? 'bg-error-container text-on-error-container'
                      : 'bg-surface-container-highest text-primary animate-pulse'
                  }`}
                >
                  {isReady ? 'Ready' : isFailed ? 'Failed' : 'Sync'}
                </span>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
