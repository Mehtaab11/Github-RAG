'use client';

import React, { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import Sidebar from '@/components/Sidebar';
import { Terminal } from 'lucide-react';
import ChatWindow from '@/components/ChatWindow';

export default function Home() {
  const initSocket = useAppStore((state) => state.initSocket);
  const activeRepoId = useAppStore((state) => state.activeRepoId);
  const repositories = useAppStore((state) => state.repositories);

  const activeRepo = repositories.find((r) => r.id === activeRepoId);

  // Mount the live socket layer immediately when the client dashboard app spins up
  useEffect(() => {
    initSocket();
  }, [initSocket]);

  return (
    <main className="flex w-screen h-screen overflow-hidden bg-slate-950 font-sans">
      {/* 1. Sidebar Control Panel Navigation */}
      <Sidebar />

      {/* 2. Chat/Workspace View Container */}
      <section className="flex-1 h-full flex flex-col bg-slate-950 text-slate-100">
        {!activeRepoId ? (
          // Placeholder State when no repository workspace context has been focused
          <div className="flex-1 flex flex-col items-center justify-center space-y-4 p-8 text-center">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-full text-indigo-400 shadow-xl">
              <Terminal className="w-10 h-10" />
            </div>
            <div className="max-w-md space-y-1">
              <h2 className="text-lg font-bold text-slate-200">Select a Codebase Workspace</h2>
              <p className="text-slate-400 text-sm">
                Choose an ingested repository from the sidebar or drop a public GitHub link to start asking contextual questions.
              </p>
            </div>
          </div>
        ) : (
          // Temporary placeholder panel layout where our core chat component will snap in next
          <div className="flex-1 flex flex-col h-full">
            {/* Header Workspace Title Bar */}
            <div className="p-4 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-200">{activeRepo?.name}</h2>
                <p className="text-[11px] text-slate-500 truncate max-w-xl">{activeRepo?.githubUrl}</p>
              </div>
              <div className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                Active Session
              </div>
            </div>

            {/* Chat Body Workspace Placeholder */}
            <ChatWindow />
          </div>
        )}
      </section>
    </main>
  );
}