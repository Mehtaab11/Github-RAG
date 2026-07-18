'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Send, Bot, User, FileText, Loader2, Code2, Clipboard, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function ChatWindow() {
    const [inputMessage, setInputMessage] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const chatBottomRef = useRef<HTMLDivElement>(null);

    const {
        activeConversationId,
        messages,
        isChatLoading,
        addMessage,
        setChatLoading,
    } = useAppStore();

    // Automatically scroll the viewport down to track new messages as they stream in
    useEffect(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isChatLoading]);

    // Dispatch the message payload to the backend RAG router
    // const handleSendMessage = async (e: React.FormEvent) => {
    //     e.preventDefault();
    //     if (!inputMessage.trim() || !activeConversationId || isChatLoading) return;

    //     const userPayloadMessage = inputMessage.trim();
    //     setInputMessage('');
    //     setChatLoading(true);

    //     // 1. Instantly append the User's message to the client view for snappy responsiveness
    //     addMessage({
    //         id: crypto.randomUUID(),
    //         role: 'USER',
    //         content: userPayloadMessage,
    //     });

    //     try {
    //         // 2. Query our Express API backend
    //         const response = await fetch(`${BACKEND_URL}/api/chat/message`, {
    //             method: 'POST',
    //             headers: { 'Content-Type': 'application/json' },
    //             body: JSON.stringify({
    //                 conversationId: activeConversationId,
    //                 message: userPayloadMessage,
    //             }),
    //         });

    //         const data = await response.json();

    //         if (response.ok) {
    //             // 3. Append the AI response along with the source files extracted from Qdrant
    //             addMessage({
    //                 id: crypto.randomUUID(),
    //                 role: 'ASSISTANT',
    //                 content: data.answer,
    //                 sources: data.sources,
    //             });
    //         } else {
    //             addMessage({
    //                 id: crypto.randomUUID(),
    //                 role: 'ASSISTANT',
    //                 content: `❌ Error: ${data.error || 'The system could not compile an answer.'}`,
    //             });
    //         }
    //     } catch (err) {
    //         console.error('Chat transaction network exception:', err);
    //         addMessage({
    //             id: crypto.randomUUID(),
    //             role: 'ASSISTANT',
    //             content: '❌ Fatal: Failed to communicate with the RAG server engine.',
    //         });
    //     } finally {
    //         setChatLoading(false);
    //     }
    // };


    // Dispatch the message payload to the backend RAG router
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputMessage.trim() || !activeConversationId || isChatLoading) return;

        const userPayloadMessage = inputMessage.trim();
        setInputMessage('');
        setChatLoading(true);

        // 1. Instantly append the User's message to the client view for snappy responsiveness
        addMessage({
            id: crypto.randomUUID(),
            role: 'USER',
            content: userPayloadMessage,
        });

        try {
            // Pull the token dynamically from local storage before firing the request
            const token = typeof window !== 'undefined' ? localStorage.getItem('repo_gpt_token') : null;

            // 2. Query our Express API backend with security headers appended
            const response = await fetch(`${BACKEND_URL}/api/chat/message`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    conversationId: activeConversationId,
                    message: userPayloadMessage,
                }),
            });
            const data = await response.json();

            if (response.ok) {
                // 3. Append the AI response along with the source files extracted from Qdrant
                addMessage({
                    id: crypto.randomUUID(),
                    role: 'ASSISTANT',
                    content: data.answer,
                    sources: data.sources,
                });
            } else {
                addMessage({
                    id: crypto.randomUUID(),
                    role: 'ASSISTANT',
                    content: `❌ Error: ${data.error || 'The system could not compile an answer.'}`,
                });
            }
        } catch (err) {
            console.error('Chat transaction network exception:', err);
            addMessage({
                id: crypto.randomUUID(),
                role: 'ASSISTANT',
                content: '❌ Fatal: Failed to communicate with the RAG server engine.',
            });
        } finally {
            setChatLoading(false);
        }
    };

    // Helper utility to let users easily copy code blocks to their clipboard
    const handleCopyCode = (codeText: string, blockId: string) => {
        navigator.clipboard.writeText(codeText);
        setCopiedId(blockId);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-950">
            {/* 1. Main Messages Stream view */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
                        <Code2 className="w-8 h-8 text-slate-700 animate-pulse" />
                        <p className="text-xs">Context loaded. Ask anything about this codebase repository!</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        // Case-insensitive so 'assistant', 'ASSISTANT', or 'bot' all render as AI
                        const isAI = msg.role?.toUpperCase() === 'ASSISTANT' || msg.role?.toUpperCase() === 'BOT';

                        return (
                            <div
                                key={msg.id}
                                className={`flex gap-4 max-w-4xl mx-auto ${isAI ? 'items-start' : 'items-start flex-row-reverse'}`}
                            >
                                {/* Profile Identity Avatar */}
                                <div
                                    className={`p-2 rounded-md shrink-0 border ${isAI
                                        ? 'bg-indigo-950/50 border-indigo-800 text-indigo-400'
                                        : 'bg-slate-900 border-slate-700 text-slate-300'
                                        }`}
                                >
                                    {isAI ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                                </div>

                                {/* Message Context Block */}
                                <div className="space-y-3 flex-1 overflow-hidden">
                                    <div
                                        className={`text-sm leading-relaxed rounded-lg p-4 ${isAI
                                            ? 'bg-slate-900/40 text-slate-200 border border-slate-900/80 shadow-inner'
                                            : 'bg-indigo-600 text-white font-medium shadow-md'
                                            }`}
                                    >
                                        {isAI ? (
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    p: ({ children }) => <p className="mb-4 last:mb-0 text-slate-300">{children}</p>,
                                                    h1: ({ children }) => <h1 className="text-xl font-bold mt-6 mb-3 text-white border-b border-slate-800 pb-1">{children}</h1>,
                                                    h2: ({ children }) => <h2 className="text-lg font-bold mt-5 mb-2 text-white">{children}</h2>,
                                                    h3: ({ children }) => <h3 className="text-base font-semibold mt-4 mb-2 text-indigo-400">{children}</h3>,
                                                    h4: ({ children }) => <h4 className="text-sm font-semibold mt-3 mb-1 text-slate-200">{children}</h4>,
                                                    ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-2 text-slate-300">{children}</ul>,
                                                    ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-2 text-slate-300">{children}</ol>,
                                                    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                                                    a: ({ children, href }) => (
                                                        <a
                                                            href={href}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-indigo-400 underline hover:text-indigo-300"
                                                        >
                                                            {children}
                                                        </a>
                                                    ),
                                                    strong: ({ children }) => <strong className="font-bold text-white bg-slate-900/50 px-1 rounded">{children}</strong>,
                                                    blockquote: ({ children }) => (
                                                        <blockquote className="border-l-2 border-indigo-700 pl-3 my-3 text-slate-400 italic">
                                                            {children}
                                                        </blockquote>
                                                    ),
                                                    table: ({ children }) => (
                                                        <div className="overflow-x-auto my-4 rounded-md border border-slate-800">
                                                            <table className="w-full text-xs">{children}</table>
                                                        </div>
                                                    ),
                                                    thead: ({ children }) => <thead className="bg-slate-900/70">{children}</thead>,
                                                    th: ({ children }) => <th className="px-3 py-2 text-left font-semibold text-slate-200 border-b border-slate-800">{children}</th>,
                                                    td: ({ children }) => <td className="px-3 py-2 border-b border-slate-900 text-slate-300 align-top">{children}</td>,

                                                    // Fenced code blocks (```...```) are always wrapped in <pre><code>
                                                    // by remark, so intercepting at the `pre` level reliably
                                                    // distinguishes them from inline code spans without needing
                                                    // the (removed-in-v9) `inline` prop.
                                                    pre({ children }: any) {
                                                        const codeChild = children?.props ?? {};
                                                        const className = codeChild.className || '';
                                                        const match = /language-(\w+)/.exec(className);
                                                        const codeString = String(codeChild.children ?? '').replace(/\n$/, '');
                                                        const blockId = `${codeString.length}-${codeString.slice(0, 12)}`;

                                                        return (
                                                            <div className="my-4 rounded-md border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl">
                                                                <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-slate-800/60 text-xs text-slate-400 font-mono">
                                                                    <span>{match ? match[1] : 'source'}</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleCopyCode(codeString, blockId)}
                                                                        className="flex items-center gap-1 hover:text-white transition-colors"
                                                                    >
                                                                        {copiedId === blockId ? (
                                                                            <>
                                                                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                                                                <span className="text-emerald-400 font-medium">Copied!</span>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <Clipboard className="w-3.5 h-3.5" />
                                                                                <span>Copy</span>
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                </div>
                                                                <pre className="p-4 overflow-x-auto font-mono text-xs text-emerald-400/90 bg-slate-950/60 leading-relaxed selection:bg-indigo-500/30">
                                                                    <code>{codeString}</code>
                                                                </pre>
                                                            </div>
                                                        );
                                                    },

                                                    // Only ever reached for inline code spans (`like this`),
                                                    // since block code is intercepted by `pre` above.
                                                    code({ children }: any) {
                                                        return (
                                                            <code className="bg-slate-900 border border-slate-800 text-indigo-300 px-1.5 py-0.5 rounded font-mono text-xs mx-0.5 break-words">
                                                                {children}
                                                            </code>
                                                        );
                                                    },
                                                }}
                                            >
                                                {msg.content}
                                            </ReactMarkdown>
                                        ) : (
                                            <span className="whitespace-pre-wrap">{msg.content}</span>
                                        )}
                                    </div>

                                    {/* Cited Semantic Reference Badges */}
                                    {isAI && msg.sources && msg.sources.length > 0 && (
                                        <div className="space-y-1.5 pl-1">
                                            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1">
                                                <FileText className="w-3 h-3" /> Grounded Source References:
                                            </p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {msg.sources.map((src, i) => (
                                                    <span
                                                        key={i}
                                                        className="bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded text-[11px] font-mono truncate max-w-xs hover:border-slate-700 transition-colors cursor-help"
                                                        title={src}
                                                    >
                                                        {src.split('/').pop()} {/* Displays file name only */}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}

                {/* Loading Bubble Indicator */}
                {isChatLoading && (
                    <div className="flex gap-4 max-w-4xl mx-auto items-start">
                        <div className="p-2 rounded-md bg-indigo-950/50 border border-indigo-800 text-indigo-400 shrink-0">
                            <Loader2 className="w-4 h-4 animate-spin" />
                        </div>
                        <div className="bg-slate-900/40 border border-slate-900 rounded-lg p-4 text-xs text-slate-400 font-mono flex items-center gap-2">
                            Analysing codebase and generating a response...
                        </div>
                    </div>
                )}
                <div ref={chatBottomRef} />
            </div>

            {/* 2. Message Form Input Footer Tray */}
            <div className="p-4 bg-slate-900/30 border-t border-slate-900">
                <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex gap-2">
                    <input
                        type="text"
                        placeholder="Ask a question about this repository code architecture..."
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        disabled={isChatLoading}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 text-slate-100 placeholder-slate-500 disabled:opacity-50"
                    />
                    <button
                        type="submit"
                        disabled={isChatLoading || !inputMessage.trim()}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-900 text-white px-5 rounded-lg font-medium transition-colors disabled:text-slate-600 border disabled:border-slate-800 border-indigo-600 flex items-center justify-center"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </form>
            </div>
        </div>
    );
}