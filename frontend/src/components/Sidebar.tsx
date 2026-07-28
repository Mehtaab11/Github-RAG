'use client';

import React, { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import api from '../utils/api';
import {
  LayoutGrid,
  FolderGit2,
  MessageSquare,
  Settings,
  Plus,
  FileText,
  HelpCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface SidebarProps {
  activeView?: 'dashboard' | 'repositories' | 'conversations' | 'settings' | 'repo-detail';
  onNavigate?: (view: 'dashboard' | 'repositories' | 'conversations' | 'settings') => void;
}

export default function Sidebar({ activeView = 'dashboard', onNavigate }: SidebarProps) {
  const {
    repositories,
    activeRepoId,
    ingestionProgress,
    setRepositories,
    setActiveRepoId,
    setActiveConversationId,
    setMessages,
  } = useAppStore();

  // Fetch repositories from backend on mount
  useEffect(() => {
    async function fetchRepos() {
      try {
        const response = await api.get('/repositories');
        setRepositories(response.data);
      } catch (err) {
        console.error('Failed to fetch repositories:', err);
      }
    }
    fetchRepos();
  }, [setRepositories]);

  const handleNavClick = (view: 'dashboard' | 'repositories' | 'conversations' | 'settings') => {
    if (onNavigate) {
      onNavigate(view);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'repositories', label: 'Repositories', icon: FolderGit2 },
    { id: 'conversations', label: 'Conversations', icon: MessageSquare },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <aside className="w-64 h-screen bg-[#0c0d14] border-r border-[#1a1c27] flex flex-col justify-between shrink-0 text-slate-200 select-none">
      {/* Top Branding & Main Navigation Section */}
      <div className="flex flex-col gap-6 p-4">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 pt-1">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-blue-600/20">
            Git
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white leading-tight">GitGPT</h1>
            <p className="text-[11px] font-medium text-slate-400 tracking-wide">AI Code Intelligence</p>
          </div>
        </div>

        {/* Primary Navigation Menu */}
        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#1f2230] text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#151722]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Middle/Bottom Actions Section */}
      <div className="flex flex-col gap-4 p-4 border-t border-[#1a1c27]">
        {/* Live Ingestion Progress Indicator Card (if job is active) */}
        {ingestionProgress && (
          <div className="p-3 bg-[#12141e] rounded-lg border border-[#1e2130] space-y-2 text-xs">
            <div className="flex items-center justify-between font-medium">
              <span className="text-blue-400 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> {ingestionProgress.status}
              </span>
              <span className="text-slate-400">{ingestionProgress.progress}%</span>
            </div>
            <div className="w-full bg-[#181a26] rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-blue-500 h-1.5 transition-all duration-300 rounded-full"
                style={{ width: `${ingestionProgress.progress}%` }}
              />
            </div>
            {ingestionProgress.error && (
              <p className="text-red-400 flex items-start gap-1 text-[11px] mt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {ingestionProgress.error}
              </p>
            )}
          </div>
        )}

        {/* Primary Action: Add Repository Button */}
        <button
          onClick={() => handleNavClick('repositories')}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2.5 rounded-lg text-sm transition-colors shadow-md shadow-blue-600/10 active:scale-[0.99]"
        >
          <Plus className="w-4 h-4" />
          <span>Add Repository</span>
        </button>

        {/* Auxiliary Footer Navigation Links */}
        <div className="flex flex-col gap-1 pt-1">
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-[#151722] transition-colors"
          >
            <FileText className="w-4 h-4 text-slate-500" />
            <span>Docs</span>
          </a>
          <button
            onClick={() => alert('GitGPT Help & Documentation: Contact support or browse repositories.')}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-[#151722] transition-colors w-full text-left"
          >
            <HelpCircle className="w-4 h-4 text-slate-500" />
            <span>Help</span>
          </button>
        </div>
      </div>
    </aside>
  );
}