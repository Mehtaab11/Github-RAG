'use client';

import React, { useState } from 'react';
import { Search, Moon, Sun, Bell, User, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface HeaderProps {
  breadcrumb?: string | React.ReactNode;
  onSearchFocus?: () => void;
}

export default function Header({ breadcrumb, onSearchFocus }: HeaderProps) {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user, logout } = useAuthStore();

  return (
    <header className="h-14 border-b border-[#1a1c27] bg-[#0c0d14]/80 backdrop-blur px-6 flex items-center justify-between shrink-0 text-slate-200 z-10">
      {/* Left: Breadcrumbs or Title */}
      <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
        {breadcrumb || <span className="font-semibold text-white">GitGPT</span>}
      </div>

      {/* Right: Search, Actions, Profile */}
      <div className="flex items-center gap-4">
        {/* Quick Search Input Container */}
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search..."
            onClick={onSearchFocus}
            className="w-48 md:w-64 bg-[#141622] border border-[#222638] rounded-lg py-1.5 pl-9 pr-8 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
          />
          <kbd className="absolute right-2.5 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-[#1c1f30] rounded border border-[#292e45] pointer-events-none">
            ⌘K
          </kbd>
        </div>

        {/* Action Controls */}
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#181a26] transition-colors"
          title="Toggle theme"
        >
          {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
        </button>

        <button
          className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#181a26] transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500" />
        </button>

        {/* User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-8 h-8 rounded-full bg-[#1e2235] border border-[#2a2e47] flex items-center justify-center text-slate-300 hover:text-white hover:border-blue-500 transition-all overflow-hidden"
          >
            <User className="w-4 h-4" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-[#12141e] border border-[#222638] rounded-xl shadow-2xl py-2 z-50 text-xs">
              <div className="px-3 py-2 border-b border-[#1e2130]">
                <p className="font-semibold text-white truncate">{user?.name || 'Developer'}</p>
                <p className="text-slate-400 truncate text-[11px]">{user?.email || 'user@gitgpt.io'}</p>
              </div>
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  logout();
                  window.location.href = '/login';
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-left font-medium mt-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
