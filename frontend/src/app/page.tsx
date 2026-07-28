'use client';

import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import DashboardView from '@/components/DashboardView';
import ImportRepoView from '@/components/ImportRepoView';
import RepoProgressView from '@/components/RepoProgressView';
import ChatWindow from '@/components/ChatWindow';
import api from '@/utils/api';
import { Settings, FolderGit2 } from 'lucide-react';

export default function Home() {
  const [activeView, setActiveView] = useState<'dashboard' | 'repositories' | 'conversations' | 'settings' | 'repo-detail'>('dashboard');

  const {
    initSocket,
    activeRepoId,
    setActiveRepoId,
    setActiveConversationId,
    setMessages,
    repositories,
  } = useAppStore();

  // Initialize socket layer on mount
  useEffect(() => {
    initSocket();
  }, [initSocket]);

  const activeRepo = repositories.find((r) => r.id === activeRepoId);

  // Handle selecting a repository context
  const handleSelectRepository = async (repoId: string) => {
    setActiveRepoId(repoId);
    const repo = repositories.find((r) => r.id === repoId);

    if (repo && (repo.status === 'PROCESSING' || repo.status === 'CLONING' || repo.status === 'PENDING')) {
      setActiveView('repo-detail');
      return;
    }

    // Switch to Chat/Conversations view for ready repositories
    setActiveView('conversations');
    setMessages([]);
    setActiveConversationId(null);

    try {
      const response = await api.post(`/chat/conversation/${repoId}`);
      setActiveConversationId(response.data.conversationId);
      setMessages(response.data.messages || []);
    } catch (err) {
      console.error('Failed to initialize conversation session:', err);
    }
  };

  const handleNavigateToDetail = (repoId: string) => {
    setActiveRepoId(repoId);
    setActiveView('repo-detail');
  };

  // Determine top header breadcrumb text dynamically based on active view
  let headerBreadcrumb: React.ReactNode = null;
  if (activeView === 'dashboard') {
    headerBreadcrumb = <span className="font-semibold text-white">Dashboard</span>;
  } else if (activeView === 'repositories') {
    headerBreadcrumb = <span className="font-semibold text-white">Import Repository</span>;
  } else if (activeView === 'repo-detail') {
    headerBreadcrumb = (
      <span className="flex items-center gap-1.5 text-slate-200 font-mono">
        <FolderGit2 className="w-4 h-4 text-blue-400" />
        <span>{activeRepo?.name || 'facebook/react'}</span>
        <span className="text-slate-400">&gt;</span>
        <span className="font-semibold text-white font-sans">Pipeline Progress</span>
      </span>
    );
  } else if (activeView === 'conversations') {
    headerBreadcrumb = (
      <span className="flex items-center gap-1.5 text-slate-200">
        <span className="text-slate-400">Repositories</span>
        <span className="text-slate-400">&gt;</span>
        <span className="font-semibold text-white font-mono">{activeRepo?.name || 'facebook/react'}</span>
        <span className="text-slate-400">&gt;</span>
        <span className="font-semibold text-white">Chat</span>
      </span>
    );
  } else if (activeView === 'settings') {
    headerBreadcrumb = <span className="font-semibold text-white">Settings</span>;
  }

  return (
    <main className="flex w-screen h-screen overflow-hidden bg-[#08090d] font-sans text-slate-100">
      {/* 1. Left Sidebar Navigation */}
      <Sidebar
        activeView={activeView === 'repo-detail' ? 'repositories' : activeView}
        onNavigate={(view) => setActiveView(view)}
      />

      {/* 2. Main Workspace Layout Area */}
      <section className="flex-1 h-full flex flex-col overflow-hidden bg-[#08090d]">
        {/* Top Header Navigation */}
        <Header breadcrumb={headerBreadcrumb} />

        {/* View Switcher Container */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeView === 'dashboard' && (
            <DashboardView
              onSelectRepo={handleSelectRepository}
              onNavigate={(view) => setActiveView(view)}
            />
          )}

          {activeView === 'repositories' && (
            <ImportRepoView
              onSelectRepo={handleSelectRepository}
              onNavigateToDetail={handleNavigateToDetail}
            />
          )}

          {activeView === 'repo-detail' && (
            <RepoProgressView
              repoId={activeRepoId || ''}
              onReadyForChat={() => setActiveView('conversations')}
            />
          )}

          {activeView === 'conversations' && <ChatWindow />}

          {activeView === 'settings' && (
            <div className="flex-1 p-8 space-y-6 max-w-4xl mx-auto text-slate-100">
              <div className="flex items-center gap-3">
                <Settings className="w-6 h-6 text-blue-400" />
                <h1 className="text-2xl font-bold text-white">Settings</h1>
              </div>
              <div className="bg-[#11131c] border border-[#1e2130] rounded-2xl p-6 space-y-4">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">AI Model Configuration</h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  GitGPT uses Google Gemini API / Qdrant vector retrieval. High dimensional code parsing is active.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}