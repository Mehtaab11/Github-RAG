'use client';

import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Check, Loader2, GitBranch, Terminal as TerminalIcon } from 'lucide-react';

interface RepoProgressViewProps {
  repoId: string;
  onReadyForChat?: () => void;
}

export default function RepoProgressView({ repoId, onReadyForChat }: RepoProgressViewProps) {
  const { repositories, ingestionProgress } = useAppStore();
  const repo = repositories.find((r) => r.id === repoId) || {
    id: repoId,
    name: 'facebook/react',
    githubUrl: 'https://github.com/facebook/react',
    status: 'PROCESSING',
  };

  const [logs, setLogs] = useState<string[]>([
    `2023-10-27 14:02:11 [INFO] Initialize processing job #8992...`,
    `2023-10-27 14:02:12 [INFO] Fetching metadata for ${repo.name}...`,
    `2023-10-27 14:02:13 [SUCCESS] Cloned 42MB in 1.2s`,
    `2023-10-27 14:02:13 [INFO] Building file tree mapping...`,
    `2023-10-27 14:02:14 [SCAN] Identified 1,240 supported files.`,
    `2023-10-27 14:02:14 [SCAN] Ignoring node_modules/ and .git/`,
    `2023-10-27 14:02:15 [SCAN] Parsing src/React.js... [AST Generated]`,
    `2023-10-27 14:02:15 [SCAN] Parsing src/ReactHooks.js... [AST Generated]`,
    `2023-10-27 14:02:16 [SCAN] Parsing packages/react-dom/src/client/ReactDOMRoot.js...`,
  ]);

  // Update live terminal logs as ingestion updates arrive
  useEffect(() => {
    if (ingestionProgress) {
      const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
      const newLogLine = `${timestamp} [${ingestionProgress.status}] ${ingestionProgress.progress}% - Processing codebase AST embeddings...`;
      setLogs((prev) => [...prev, newLogLine]);

      if (ingestionProgress.status === 'READY' && onReadyForChat) {
        onReadyForChat();
      }
    }
  }, [ingestionProgress, onReadyForChat]);

  // Stepper definition
  const steps = [
    { id: 'queued', title: 'Queued', completed: true },
    {
      id: 'cloning',
      title: 'Cloning Repository',
      completed: true,
      subtext: 'Time: 1.2s • Size: 42MB',
    },
    {
      id: 'scanning',
      title: 'Scanning Files',
      active: true,
      subtext: 'Parsing AST for 1,240 files...',
    },
    { id: 'chunking', title: 'Chunking Code', pending: true },
    { id: 'embeddings', title: 'Generating Embeddings', pending: true },
    { id: 'ready', title: 'Ready for Chat', pending: true },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#08090d] text-slate-100 max-w-6xl mx-auto">
      {/* Top Repo Header Card */}
      <div className="bg-[#11131c] border border-[#1e2130] rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <GitBranch className="w-5 h-5 text-slate-400" />
            <h1 className="text-2xl font-extrabold text-white tracking-tight font-mono">
              {repo.name}
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-mono">main branch • 12.4k commits</p>
        </div>

        <div>
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 tracking-wider">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            PROCESSING...
          </span>
        </div>
      </div>

      {/* 2-Column Split Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Vertical Ingestion Pipeline Stepper (1 Column) */}
        <div className="bg-[#11131c] border border-[#1e2130] rounded-2xl p-6 space-y-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            INGESTION PIPELINE
          </h2>

          <div className="relative pl-6 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#1e2130]">
            {steps.map((step, idx) => (
              <div key={idx} className="relative flex items-start gap-4">
                {/* Circle Icon */}
                <div
                  className={`absolute -left-[27px] w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step.completed
                      ? 'bg-slate-700 text-white'
                      : step.active
                      ? 'bg-blue-600 text-white ring-4 ring-blue-600/20'
                      : 'bg-[#181b28] border border-[#2a2e45] text-slate-500'
                  }`}
                >
                  {step.completed ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : step.active ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                {/* Step Text Details */}
                <div className="space-y-0.5">
                  <h3
                    className={`text-sm font-bold ${
                      step.active
                        ? 'text-blue-400'
                        : step.completed
                        ? 'text-white'
                        : 'text-slate-500'
                    }`}
                  >
                    {step.title}
                  </h3>
                  {step.subtext && (
                    <p className="text-[11px] text-slate-400 leading-snug">{step.subtext}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Terminal Log Viewer (2 Columns wide) */}
        <div className="lg:col-span-2 bg-[#090a10] border border-[#1e2130] rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[480px]">
          {/* Terminal Window Header Bar */}
          <div className="px-4 py-3 bg-[#11131c] border-b border-[#1e2130] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            </div>
            <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
              <TerminalIcon className="w-3.5 h-3.5" />
              <span>gitgpt-worker-04</span>
            </div>
            <div className="w-12" />
          </div>

          {/* Terminal Console Output */}
          <div className="flex-1 p-5 overflow-y-auto font-mono text-xs text-slate-300 space-y-2 selection:bg-blue-600/30">
            {logs.map((log, i) => (
              <div key={i} className="leading-relaxed">
                {log.includes('[SUCCESS]') ? (
                  <span className="text-emerald-400 font-semibold">{log}</span>
                ) : log.includes('[SCAN]') ? (
                  <span className="text-blue-300">{log}</span>
                ) : (
                  <span>{log}</span>
                )}
              </div>
            ))}
            <div className="flex items-center gap-1 text-blue-400 animate-pulse pt-2">
              <span>_</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
