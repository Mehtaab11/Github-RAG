'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import {
  Send,
  Bot,
  Loader2,
  Copy,
  Check,
  Plus,
  MoreHorizontal,
  ChevronDown,
  Folder,
  FileCode,
  FileText,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../utils/api';

export default function ChatWindow() {
  const [inputMessage, setInputMessage] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'explorer'>('explorer');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    packages: true,
    react: true,
    src: true,
  });

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    repositories,
    activeRepoId,
    activeConversationId,
    messages,
    isChatLoading,
    addMessage,
    setChatLoading,
  } = useAppStore();

  const activeRepo = repositories.find((r) => r.id === activeRepoId) || {
    name: 'facebook/react',
    githubUrl: 'https://github.com/facebook/react',
  };

  // Keyboard shortcut listener (Cmd/Ctrl + K to focus input)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto scroll message list
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatLoading]);

  // Handle message submission
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeConversationId || isChatLoading) return;

    const userPayloadMessage = inputMessage.trim();
    setInputMessage('');
    setChatLoading(true);

    // Append User message
    addMessage({
      id: crypto.randomUUID(),
      role: 'USER',
      content: userPayloadMessage,
    });

    try {
      const response = await api.post('/chat/message', {
        conversationId: activeConversationId,
        message: userPayloadMessage,
      });

      // Append Assistant message
      addMessage({
        id: crypto.randomUUID(),
        role: 'ASSISTANT',
        content: response.data.answer,
        sources: response.data.sources,
      });
    } catch (err: any) {
      console.error('Chat error:', err);
      const errMsg = err.response?.data?.error || 'Failed to generate response.';
      addMessage({
        id: crypto.randomUUID(),
        role: 'ASSISTANT',
        content: `❌ Error: ${errMsg}`,
      });
    } finally {
      setChatLoading(false);
    }
  };

  const handleCopyCode = (codeText: string, blockId: string) => {
    navigator.clipboard.writeText(codeText);
    setCopiedId(blockId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleFolder = (folderName: string) => {
    setExpandedFolders((prev) => ({ ...prev, [folderName]: !prev[folderName] }));
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-[#08090d]">
      {/* Center/Left Main Chat View */}
      <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-[#1a1c27]">
        {/* Top Chat Header / Breadcrumb Bar */}
        <div className="px-6 py-3.5 border-b border-[#1a1c27] bg-[#0c0d14] flex items-center justify-between text-xs text-slate-300 shrink-0">
          <div className="flex items-center gap-2 font-medium">
            <span className="text-slate-400">Repositories</span>
            <span className="text-slate-400">&gt;</span>
            <span className="flex items-center gap-1.5 text-slate-200">
              <Folder className="w-3.5 h-3.5 text-blue-400" />
              {activeRepo.name}
            </span>
            <span className="text-slate-400">&gt;</span>
            <span className="font-semibold text-white">Chat</span>
          </div>

          <button className="p-1 text-slate-400 hover:text-white transition-colors">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Message Thread Scroll View */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Bot className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium">Repository context loaded for {activeRepo.name}</p>
              <p className="text-xs text-slate-400">Ask any question about architecture, code flow, or implementations.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isAI = msg.role?.toUpperCase() === 'ASSISTANT' || msg.role?.toUpperCase() === 'BOT';

              return (
                <div key={msg.id} className="max-w-4xl mx-auto space-y-4">
                  {/* User Bubble */}
                  {!isAI && (
                    <div className="flex justify-end">
                      <div className="bg-[#181b28] border border-[#262a3e] text-slate-100 rounded-2xl px-5 py-3.5 max-w-2xl text-sm leading-relaxed shadow-lg">
                        {msg.content}
                      </div>
                    </div>
                  )}

                  {/* AI Response Block */}
                  {isAI && (
                    <div className="flex items-start gap-3.5">
                      {/* Bot Logo Badge */}
                      <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 mt-1 shadow-md shadow-blue-600/20">
                        <Bot className="w-4 h-4" />
                      </div>

                      <div className="space-y-4 flex-1 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">GitGPT</span>
                        </div>

                        {/* Markdown Output Area */}
                        <div className="text-sm text-slate-200 leading-relaxed space-y-3">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
                              code({ children }: any) {
                                return (
                                  <code className="bg-[#141622] border border-[#24283b] text-blue-300 px-1.5 py-0.5 rounded font-mono text-xs mx-0.5">
                                    {children}
                                  </code>
                                );
                              },
                              pre({ children }: any) {
                                const codeChild = children?.props ?? {};
                                const className = codeChild.className || '';
                                const match = /language-(\w+)/.exec(className);
                                const codeString = String(codeChild.children ?? '').replace(/\n$/, '');
                                const blockId = `${codeString.length}-${codeString.slice(0, 10)}`;

                                return (
                                  <div className="my-4 rounded-xl border border-[#1e2130] bg-[#0c0d14] overflow-hidden shadow-2xl">
                                    {/* Header bar of Code Block */}
                                    <div className="flex items-center justify-between px-4 py-2.5 bg-[#12141e] border-b border-[#1e2130] text-xs font-mono text-slate-400">
                                      <span className="flex items-center gap-1.5 text-slate-300">
                                        <code>&lt;&gt;</code>
                                        <span>packages/react/src/ReactHooks.js</span>
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleCopyCode(codeString, blockId)}
                                        className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors"
                                      >
                                        {copiedId === blockId ? (
                                          <>
                                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                                            <span className="text-emerald-400">Copied</span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="w-3.5 h-3.5" />
                                            <span>Copy</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                    <pre className="p-4 overflow-x-auto font-mono text-xs text-blue-200 bg-[#08090d] leading-relaxed">
                                      <code>{codeString}</code>
                                    </pre>
                                  </div>
                                );
                              },
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>

                        {/* Referenced Sources Footer Badges */}
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="pt-2 space-y-2 border-t border-[#181a26]">
                            <p className="text-[11px] font-semibold text-slate-400">Referenced Sources</p>
                            <div className="flex flex-wrap gap-2">
                              {msg.sources.map((src, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center gap-1.5 bg-[#12141e] border border-[#1e2130] text-slate-300 px-2.5 py-1 rounded-lg text-xs font-mono"
                                >
                                  <FileCode className="w-3 h-3 text-blue-400" />
                                  <span>{src}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {isChatLoading && (
            <div className="max-w-4xl mx-auto flex items-center gap-3 text-slate-400 text-xs font-mono">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <span>Searching vector database & generating response...</span>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Floating Input Container at Bottom */}
        <div className="p-4 bg-[#08090d] border-t border-[#1a1c27]">
          <div className="max-w-4xl mx-auto space-y-2">
            <form onSubmit={handleSendMessage} className="relative flex items-center bg-[#11131c] border border-[#1e2130] rounded-2xl p-1.5 shadow-xl">
              <button
                type="button"
                className="p-2 text-slate-400 hover:text-white rounded-xl transition-colors"
                title="Add attachment or snippet"
              >
                <Plus className="w-4 h-4" />
              </button>

              <input
                ref={inputRef}
                type="text"
                placeholder={`Ask anything about ${activeRepo.name.split('/').pop()}...`}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={isChatLoading}
                className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-100 placeholder-slate-400 focus:outline-none disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={isChatLoading || !inputMessage.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-[#1a1c29] disabled:text-slate-400 text-white p-2 rounded-xl transition-all shadow-md shrink-0 flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-2 font-mono">
              <span>⌘K to focus input</span>
              <div className="flex items-center gap-1 bg-[#11131c] border border-[#1e2130] px-2 py-0.5 rounded-md text-slate-400 cursor-pointer hover:text-white">
                <span>Model: Gemini-1.5-Pro</span>
                <ChevronDown className="w-3 h-3" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Explorer Panel */}
      <div className="w-72 bg-[#0c0d14] flex flex-col shrink-0 border-l border-[#1a1c27]">
        {/* Panel Tabs Header */}
        <div className="flex border-b border-[#1a1c27] text-xs font-semibold">
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex-1 py-3 text-center transition-colors ${
              activeTab === 'summary'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Summary
          </button>
          <button
            onClick={() => setActiveTab('explorer')}
            className={`flex-1 py-3 text-center transition-colors ${
              activeTab === 'explorer'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Explorer
          </button>
        </div>

        {/* Panel Content View */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-mono">
          {activeTab === 'summary' ? (
            <div className="space-y-3 font-sans text-slate-300">
              <h3 className="font-bold text-white text-sm">Codebase Architecture Overview</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Indexed code vector embeddings enable multi-file dependency tracing, interface definitions, and state transitions.
              </p>
            </div>
          ) : (
            <div className="space-y-1 select-none text-slate-300">
              {/* Directory Tree Level 1 */}
              <div>
                <button
                  onClick={() => toggleFolder('packages')}
                  className="flex items-center gap-2 w-full py-1 px-1.5 rounded hover:bg-[#151824] text-slate-300"
                >
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  <Folder className="w-3.5 h-3.5 text-blue-400" />
                  <span>packages</span>
                </button>

                {expandedFolders['packages'] && (
                  <div className="pl-4 space-y-1 pt-1">
                    <button
                      onClick={() => toggleFolder('react')}
                      className="flex items-center gap-2 w-full py-1 px-1.5 rounded hover:bg-[#151824] text-slate-300"
                    >
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      <Folder className="w-3.5 h-3.5 text-blue-400" />
                      <span>react</span>
                    </button>

                    {expandedFolders['react'] && (
                      <div className="pl-4 space-y-1 pt-1">
                        <button
                          onClick={() => toggleFolder('src')}
                          className="flex items-center gap-2 w-full py-1 px-1.5 rounded hover:bg-[#151824] text-slate-300"
                        >
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                          <Folder className="w-3.5 h-3.5 text-blue-400" />
                          <span>src</span>
                        </button>

                        {expandedFolders['src'] && (
                          <div className="pl-4 space-y-1 pt-1">
                            <div className="flex items-center gap-2 py-1 px-2 rounded bg-[#1e2233] text-white font-medium">
                              <FileCode className="w-3.5 h-3.5 text-blue-400" />
                              <span>ReactHooks.js</span>
                            </div>
                            <div className="flex items-center gap-2 py-1 px-2 rounded hover:bg-[#151824] text-slate-400 hover:text-slate-200">
                              <FileCode className="w-3.5 h-3.5 text-slate-400" />
                              <span>ReactBaseClasses.js</span>
                            </div>
                            <div className="flex items-center gap-2 py-1 px-2 rounded hover:bg-[#151824] text-slate-400 hover:text-slate-200">
                              <FileCode className="w-3.5 h-3.5 text-slate-400" />
                              <span>ReactContext.js</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2 py-1 px-1.5 rounded hover:bg-[#151824] text-slate-400 pt-1">
                      <Folder className="w-3.5 h-3.5 text-slate-400" />
                      <span>react-dom</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}