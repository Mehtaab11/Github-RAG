'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from "../store/authStore";
import { FolderCode, Plus, Loader2, AlertCircle, CheckCircle2, GitBranch } from 'lucide-react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function Sidebar() {
  const [githubUrl, setGithubUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const token = useAuthStore((state) => state.token);

  // Extract relevant states and setters from our Zustand slice
  const {
    repositories,
    activeRepoId,
    ingestionProgress,
    setRepositories,
    setActiveRepoId,
    setActiveConversationId,
    setMessages,
  } = useAppStore();

  // 1. Fetch existing repositories from our backend database on component mount
  useEffect(() => {
    async function fetchRepos() {
      try {
        const response = await fetch(`${BACKEND_URL}/api/repositories`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setRepositories(data);
        }
      } catch (err) {
        console.error('Failed to populate repository indexing list:', err);
      }
    }
    fetchRepos();
  }, [setRepositories]);

  // 2. Dispatch a new ingestion job request to the Express API
  const handleIngestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubUrl.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/repositories/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ githubUrl }),
      });
      const data = await response.json();

      if (response.ok) {
        // If it's a completely new or existing repository item structure
        const targetRepo = data.repository;

        // Append to local state list if it doesn't exist
        if (!repositories.some((r) => r.id === targetRepo.id)) {
          setRepositories([...repositories, targetRepo]);
        }

        // Set as active repository to bind socket events immediately
        setActiveRepoId(targetRepo.id);
        setGithubUrl('');
      } else {
        alert(data.error || 'Failed to submit code ingestion payload.');
      }
    } catch (err) {
      console.error('Network transaction exception:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Handle changing the repository context workspace selection
  const handleSelectRepository = async (repoId: string) => {
    setActiveRepoId(repoId);
    setMessages([]);
    setActiveConversationId(null);

    // Fetch or create an active chat session conversation for this repo selection
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/chat/conversation/${repoId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setActiveConversationId(data.conversationId);
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Failed to provision conversation link context:', err);
    }
  };

  return (
    <aside className="w-80 h-screen bg-slate-900 border-r border-slate-800 flex flex-col text-slate-200">
      {/* Brand Header Header */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-2">
        <FolderCode className="w-6 h-6 text-indigo-400" />
        <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
          CodeRAG Engine
        </h1>
      </div>

      {/* URL Submission Block Form */}
      <form onSubmit={handleIngestSubmit} className="p-4 border-b border-slate-800 space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Index New Repository
        </label>
        <div className="relative flex items-center">
          <input
            type="url"
            placeholder="https://github.com/..."
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            disabled={isSubmitting}
            className="w-full bg-slate-950 border border-slate-800 rounded-md py-2 pl-3 pr-10 text-xs focus:outline-none focus:border-indigo-500 text-slate-100 disabled:opacity-50"
            required
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="absolute right-1.5 p-1 text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>
      </form>

      {/* Live Background Progress Banner Card Component */}
      {ingestionProgress && (
        <div className="m-4 p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between font-medium">
            <span className="text-indigo-400 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin inline" /> {ingestionProgress.status}
            </span>
            <span>{ingestionProgress.progress}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-500 h-1.5 transition-all duration-300"
              style={{ width: `${ingestionProgress.progress}%` }}
            />
          </div>
          {ingestionProgress.error && (
            <p className="text-red-400 flex items-start gap-1 text-[11px] mt-1">
              <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" /> {ingestionProgress.error}
            </p>
          )}
        </div>
      )}

      {/* Main Repository Navigation Listing Rows */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Ingested Repositories
        </p>

        {repositories.length === 0 ? (
          <p className="text-slate-500 text-xs px-3 py-4 text-center">No indexed codebases found.</p>
        ) : (
          repositories.map((repo) => {
            const isActive = repo.id === activeRepoId;
            return (
              <button
                key={repo.id}
                onClick={() => handleSelectRepository(repo.id)}
                className={`w-full flex items-center justify-between p-3 rounded-md transition-colors text-left text-xs ${isActive ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-slate-300'
                  }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <GitBranch className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span className="truncate font-medium">{repo.name}</span>
                </div>

                {/* Status Badge Indicators */}
                <span className="shrink-0 ml-2">
                  {repo.status === 'READY' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  {repo.status === 'FAILED' && <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
                  {(repo.status === 'CLONING' || repo.status === 'PROCESSING' || repo.status === 'PENDING') && (
                    <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  )}
                </span>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}