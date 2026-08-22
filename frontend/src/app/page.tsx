'use client';

import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import Sidebar from '@/components/Sidebar';
import ChatWindow from '@/components/ChatWindow';

export default function Home() {
  const initSocket = useAppStore((state) => state.initSocket);
  const activeRepoId = useAppStore((state) => state.activeRepoId);
  const repositories = useAppStore((state) => state.repositories);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const activeRepo = repositories.find((r) => r.id === activeRepoId);

  // Mount socket connection and theme
  useEffect(() => {
    initSocket();
    const savedTheme = (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
    setTheme(savedTheme);
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
  }, [initSocket]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-surface-container-lowest font-body-md text-on-surface antialiased overflow-hidden select-none">
      {/* 1. Minimal Top Navigation Bar */}
      <header className="flex justify-between items-center px-6 w-full h-12 z-50 bg-background border-b border-outline-variant flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="font-headline-md text-headline-md font-bold text-primary tracking-tight">
            GitGPT
          </span>
          <span className="text-outline-variant">/</span>
          <span className="font-code-sm text-code-sm text-on-surface-variant truncate max-w-xs">
            {activeRepo ? activeRepo.name : 'Workspace'}
          </span>
        </div>

        {/* Right Section with Status & Theme Toggle */}
        <div className="flex items-center gap-3 font-code-sm text-xs text-on-surface-variant">
          {activeRepo ? (
            <span className="px-2 py-0.5 rounded-[2px] bg-surface-container border border-outline-variant">
              {activeRepo.status}
            </span>
          ) : null}

          <button
            type="button"
            onClick={toggleTheme}
            className="px-2.5 py-1 rounded-[2px] bg-surface-container border border-outline-variant hover:border-primary text-on-surface transition-colors cursor-pointer text-xs font-code-sm uppercase"
          >
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </header>

      {/* 2. Main Workspace Layout */}
      <main className="flex-1 flex overflow-hidden w-full h-[calc(100vh-48px)]">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Central Chat Workspace Section */}
        <section className="flex-1 h-full flex flex-col bg-background text-on-surface min-w-0">
          {!activeRepoId ? (
            /* Minimal Empty State */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center my-auto max-w-lg mx-auto space-y-3">
              <h2 className="font-headline-md text-lg font-semibold text-primary">
                Select a Repository
              </h2>
              <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
                Choose an ingested codebase from the sidebar or submit a public GitHub URL to begin asking technical questions.
              </p>
            </div>
          ) : (
            /* Active Workspace Chat Window */
            <ChatWindow />
          )}
        </section>
      </main>
    </div>
  );
}

