'use client';

import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import api from '../utils/api';
import {
  Download,
  Code2,
  Cpu,
  FolderGit2,
  Loader2,
  Info,
} from 'lucide-react';

interface ImportRepoViewProps {
  onSelectRepo: (repoId: string) => void;
  onNavigateToDetail?: (repoId: string) => void;
}

export default function ImportRepoView({ onSelectRepo, onNavigateToDetail }: ImportRepoViewProps) {
  const [githubUrl, setGithubUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { repositories, setRepositories, setActiveRepoId } = useAppStore();

  const handleIngestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubUrl.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await api.post('/repositories/ingest', { githubUrl });
      const targetRepo = response.data.repository;

      if (!repositories.some((r) => r.id === targetRepo.id)) {
        setRepositories([targetRepo, ...repositories]);
      }

      setActiveRepoId(targetRepo.id);
      setGithubUrl('');

      if (onNavigateToDetail) {
        onNavigateToDetail(targetRepo.id);
      } else {
        onSelectRepo(targetRepo.id);
      }
    } catch (err: any) {
      console.error('Ingestion error:', err);
      const errMsg = err.response?.data?.error || 'Failed to submit code ingestion job.';
      alert(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sampleRecentImports =
    repositories.length > 0
      ? repositories
      : [
          {
            id: 'import-1',
            name: 'vercel/next.js',
            status: 'READY',
            subtitle: 'Imported 2 hours ago',
          },
          {
            id: 'import-2',
            name: 'facebook/react',
            status: 'READY',
            subtitle: 'Imported yesterday',
          },
          {
            id: 'import-3',
            name: 'tailwindlabs/tailwindcss',
            status: 'PROCESSING',
            subtitle: 'Indexing in progress...',
          },
        ];

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-12 bg-[#08090d] text-slate-100 max-w-5xl mx-auto">
      {/* Title Header */}
      <div className="text-center space-y-2 pt-4">
        <h1 className="text-3xl font-bold text-white tracking-tight">Import Repository</h1>
        <p className="text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
          Connect a GitHub repository to enable AI-powered code analysis and conversational search.
        </p>
      </div>

      {/* Main Import Form Card */}
      <div className="bg-[#11131c] border border-[#1e2130] rounded-2xl p-8 shadow-xl max-w-3xl mx-auto space-y-4">
        <form onSubmit={handleIngestSubmit} className="space-y-3">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
            GITHUB REPOSITORY URL
          </label>
          <div className="flex items-center">
            <input
              type="url"
              placeholder="https://github.com/username/repository"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              disabled={isSubmitting}
              required
              className="flex-1 bg-[#090a10] border border-[#1e2130] rounded-l-xl py-3 px-4 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isSubmitting || !githubUrl.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800/50 text-white font-semibold text-sm px-6 py-3 rounded-r-xl transition-colors shrink-0 flex items-center justify-center min-w-[170px]"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Ingesting...
                </span>
              ) : (
                'Analyze Repository'
              )}
            </button>
          </div>
        </form>

        <p className="text-xs text-slate-400 flex items-center gap-1.5 pt-1">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Requires a public repository or appropriate GitHub token configuration.</span>
        </p>
      </div>

      {/* 3 Step Process Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-3xl mx-auto">
        <div className="bg-[#11131c] border border-[#1e2130] rounded-2xl p-5 space-y-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Download className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-white">1. Cloning</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Fetching repository history and file structure.
          </p>
        </div>

        <div className="bg-[#11131c] border border-[#1e2130] rounded-2xl p-5 space-y-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Code2 className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-white">2. Chunking</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Splitting code into logical, context-aware segments.
          </p>
        </div>

        <div className="bg-[#11131c] border border-[#1e2130] rounded-2xl p-5 space-y-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Cpu className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-white">3. Embeddings</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Generating vector representations for semantic search.
          </p>
        </div>
      </div>

      {/* Recent Imports List */}
      <div className="max-w-3xl mx-auto space-y-4 pt-4">
        <h2 className="text-lg font-bold text-white tracking-tight">Recent Imports</h2>

        <div className="space-y-3">
          {sampleRecentImports.map((repo: any) => {
            const isProcessing = repo.status === 'PROCESSING' || repo.status === 'CLONING' || repo.status === 'PENDING';
            return (
              <div
                key={repo.id}
                onClick={() => onSelectRepo(repo.id)}
                className="bg-[#11131c] border border-[#1e2130] rounded-xl p-4 flex items-center justify-between hover:border-[#2a2e45] transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-[#171926] border border-[#222638] text-slate-400 group-hover:text-blue-400 transition-colors">
                    <FolderGit2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors font-mono">
                      {repo.name}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {repo.subtitle || (repo.createdAt ? `Imported ${repo.createdAt}` : 'Imported recently')}
                    </p>
                  </div>
                </div>

                <div>
                  {isProcessing ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Indexing
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Ready
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
