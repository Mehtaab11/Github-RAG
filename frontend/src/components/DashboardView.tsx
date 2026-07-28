'use client';

import React from 'react';
import { useAppStore } from '../store/useAppStore';
import {
  FolderGit2,
  Database,
  MessageSquare,
  ArrowRight,
  Plus,
  Bot,
  Clock,
  Loader2,
} from 'lucide-react';

interface DashboardViewProps {
  onSelectRepo: (repoId: string) => void;
  onNavigate: (view: 'dashboard' | 'repositories' | 'conversations' | 'settings') => void;
}

export default function DashboardView({ onSelectRepo, onNavigate }: DashboardViewProps) {
  const { repositories } = useAppStore();

  const totalRepos = repositories.length > 0 ? repositories.length : 12;
  const readyRepos = repositories.filter((r) => r.status === 'READY').length || 10;
  const activeConversationsCount = 5;

  // Mock initial items if repositories array is empty initially to match the reference screen layout
  const displayRepos =
    repositories.length > 0
      ? repositories
      : [
          {
            id: 'demo-1',
            name: 'api-gateway-v2',
            githubUrl: 'https://github.com/org/api-gateway-v2',
            status: 'READY',
            description: 'Main entry point for all external microservices traffic. Includes auth...',
            updatedAt: '2h ago',
            lang: 'TypeScript',
          },
          {
            id: 'demo-2',
            name: 'core-engine-rust',
            githubUrl: 'https://github.com/org/core-engine-rust',
            status: 'PROCESSING',
            description: 'High performance data processing engine for analytics ingestion.',
            progress: 45,
            updatedAt: 'Indexing 45%',
            lang: 'Rust',
          },
          {
            id: 'demo-3',
            name: 'frontend-ui-lib',
            githubUrl: 'https://github.com/org/frontend-ui-lib',
            status: 'READY',
            description: 'React component library using Tailwind CSS and Radix UI...',
            updatedAt: '1d ago',
            lang: 'TSX',
          },
        ];

  const recentConversations = [
    {
      id: 'c1',
      title: 'Optimize DB queries in Gateway',
      snippet: 'Explain the N+1 problem occurring in the query pipeline...',
      repo: 'api-gateway-v2',
      time: '10m ago',
    },
    {
      id: 'c2',
      title: 'Implement JWT Rotation',
      snippet: 'How do I securely implement refresh tokens in authentication...',
      repo: 'auth-service',
      time: '2h ago',
    },
    {
      id: 'c3',
      title: 'Rust Lifetime Errors',
      snippet: "I'm getting E0106 on the struct data reference...",
      repo: 'core-engine-rust',
      time: 'Yesterday',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#08090d] text-slate-100">
      {/* Header Greeting */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Welcome back, Developer</h1>
        <p className="text-sm text-slate-400 mt-1">Here is a quick overview of your workspace.</p>
      </div>

      {/* 3 Metric Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Total Repositories */}
        <div className="relative overflow-hidden bg-[#11131c] border border-[#1e2130] rounded-2xl p-6 flex flex-col justify-between h-36 group hover:border-[#2a2e45] transition-all">
          <div>
            <span className="text-xs font-semibold text-slate-400 tracking-wider">Total Repositories</span>
            <div className="text-4xl font-extrabold text-white mt-2">
              {repositories.length > 0 ? repositories.length : 12}
            </div>
          </div>
          {/* Subtle Graphic Watermark */}
          <div className="absolute right-4 bottom-3 opacity-10 group-hover:opacity-20 transition-opacity text-blue-400">
            <FolderGit2 className="w-20 h-20" />
          </div>
        </div>

        {/* Card 2: Indexed Repos */}
        <div className="relative overflow-hidden bg-[#11131c] border border-[#1e2130] rounded-2xl p-6 flex flex-col justify-between h-36 group hover:border-[#2a2e45] transition-all">
          <div>
            <span className="text-xs font-semibold text-slate-400 tracking-wider">Indexed Repos</span>
            <div className="text-4xl font-extrabold text-blue-400 mt-2">{readyRepos}</div>
          </div>
          <div className="absolute right-4 bottom-3 opacity-10 group-hover:opacity-20 transition-opacity text-blue-400">
            <Database className="w-20 h-20" />
          </div>
        </div>

        {/* Card 3: Active Conversations */}
        <div className="relative overflow-hidden bg-[#11131c] border border-[#1e2130] rounded-2xl p-6 flex flex-col justify-between h-36 group hover:border-[#2a2e45] transition-all">
          <div>
            <span className="text-xs font-semibold text-slate-400 tracking-wider">Active Conversations</span>
            <div className="text-4xl font-extrabold text-white mt-2">{activeConversationsCount}</div>
          </div>
          <div className="absolute right-4 bottom-3 opacity-10 group-hover:opacity-20 transition-opacity text-blue-400">
            <MessageSquare className="w-20 h-20" />
          </div>
        </div>
      </div>

      {/* 2-Column Main Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Recent Repositories (2 Columns wide) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white tracking-tight">Recent Repositories</h2>
            <button
              onClick={() => onNavigate('repositories')}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-blue-400 transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {displayRepos.map((repo: any) => {
              const isProcessing = repo.status === 'PROCESSING' || repo.status === 'CLONING';
              return (
                <div
                  key={repo.id}
                  onClick={() => onSelectRepo(repo.id)}
                  className="bg-[#11131c] border border-[#1e2130] rounded-xl p-5 hover:border-blue-500/50 cursor-pointer transition-all flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-semibold text-white group-hover:text-blue-400 transition-colors truncate">
                        <FolderGit2 className="w-4 h-4 text-slate-400 group-hover:text-blue-400 shrink-0" />
                        <span className="truncate text-sm">{repo.name}</span>
                      </div>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${
                          isProcessing
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {isProcessing && <Loader2 className="w-3 h-3 animate-spin" />}
                        {isProcessing ? 'Processing' : 'Ready'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {repo.description || 'Repository codebase indexed for natural language QA.'}
                    </p>
                  </div>

                  {/* Processing Progress Bar (if processing) */}
                  {isProcessing && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Indexing {repo.progress || 45}%</span>
                        <span className="font-mono">{repo.lang || 'Code'}</span>
                      </div>
                      <div className="w-full bg-[#181b28] rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${repo.progress || 45}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {!isProcessing && (
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-[#181a26]">
                      <span>Updated {repo.updatedAt || 'recently'}</span>
                      <span className="font-mono text-slate-400">{repo.lang || 'TypeScript'}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Recent Conversations (1 Column wide) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white tracking-tight">Recent Conversations</h2>
            <button
              onClick={() => onNavigate('conversations')}
              className="p-1 text-slate-400 hover:text-white transition-colors"
              title="New Conversation"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {recentConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => onNavigate('conversations')}
                className="bg-[#11131c] border border-[#1e2130] rounded-xl p-4 hover:border-[#2a2e45] cursor-pointer transition-all flex items-start gap-3 group"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="space-y-1 overflow-hidden flex-1">
                  <h3 className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                    {conv.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 truncate">{conv.snippet}</p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-1 font-mono">
                    <span>{conv.repo}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {conv.time}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* View All History Button */}
          <button
            onClick={() => onNavigate('conversations')}
            className="w-full py-2.5 rounded-xl border border-[#1e2130] bg-[#11131c] text-xs font-medium text-slate-300 hover:text-white hover:border-[#2a2e45] transition-all text-center mt-2"
          >
            View All History
          </button>
        </div>
      </div>
    </div>
  );
}
