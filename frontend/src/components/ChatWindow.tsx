'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Send, Bot, User, FileText, Loader2, Code2 } from 'lucide-react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function ChatWindow() {
    const [inputMessage, setInputMessage] = useState('');
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
            // 2. Query our Express API backend
            const response = await fetch(`${BACKEND_URL}/api/chat/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-950">
            {/* 1. Main Messages Stream Stream view */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
                        <Code2 className="w-8 h-8 text-slate-700 animate-pulse" />
                        <p className="text-xs">Context loaded. Ask anything about this codebase repository!</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isAI = msg.role === 'ASSISTANT';
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
                                        className={`text-sm leading-relaxed rounded-lg p-4 whitespace-pre-wrap ${isAI
                                            ? 'bg-slate-900/40 text-slate-200 border border-slate-900'
                                            : 'bg-indigo-600 text-white font-medium shadow-md'
                                            }`}
                                    >
                                        {msg.content}
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
                                                        className="bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded text-[11px] font-mono truncate max-w-xs"
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