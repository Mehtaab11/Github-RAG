"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAppStore } from "../store/useAppStore";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import api from "../utils/api";

export default function ChatWindow() {
  const [inputMessage, setInputMessage] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const {
    activeConversationId,
    messages,
    isChatLoading,
    addMessage,
    setChatLoading,
  } = useAppStore();

  // Scroll to bottom as messages arrive
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isChatLoading]);

  // Dispatch message to API
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeConversationId || isChatLoading) return;

    const userPayloadMessage = inputMessage.trim();
    setInputMessage("");
    setChatLoading(true);

    addMessage({
      id: crypto.randomUUID(),
      role: "USER",
      content: userPayloadMessage,
    });

    try {
      const response = await api.post("/chat/message", {
        conversationId: activeConversationId,
        message: userPayloadMessage,
      });

      addMessage({
        id: crypto.randomUUID(),
        role: "ASSISTANT",
        content: response.data.answer,
        sources: response.data.sources,
      });
    } catch (err: any) {
      console.error("Chat error:", err);
      const errMsg =
        err.response?.data?.error || "Could not compile an answer.";
      addMessage({
        id: crypto.randomUUID(),
        role: "ASSISTANT",
        content: `Error: ${errMsg}`,
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

  return (
    <div className="flex-1 flex flex-col h-full bg-background min-w-0 font-body-md relative overflow-hidden">
      {/* Main Messages Stream Area */}
      <div className="flex-1 overflow-y-auto p-8 flex flex-col space-y-6 pb-36 max-w-3xl mx-auto w-full scrollbar-hide">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant my-auto text-center">
            <p className="text-sm text-on-surface-variant font-code-sm">
              Ask any question about this repository codebase.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isAI =
              msg.role?.toUpperCase() === "ASSISTANT" ||
              msg.role?.toUpperCase() === "BOT";
            const cleanContent = (msg.content || "").replace(
              /<br\s*\/?>/gi,
              "\n",
            );

            return (
              <div key={msg.id} className="w-full">
                {isAI ? (
                  /* Assistant Response */
                  <div className="space-y-3 w-full">
                    <div className="text-xs font-code-sm text-primary font-medium">
                      GitGPT
                    </div>

                    <div className="text-on-surface text-[15px] leading-relaxed space-y-4">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => (
                            <p className="text-on-surface text-[15px] leading-relaxed mb-3 last:mb-0">
                              {children}
                            </p>
                          ),
                          h1: ({ children }) => (
                            <h1 className="text-[18px] font-bold text-primary mt-4 mb-2 border-b border-outline-variant pb-1">
                              {children}
                            </h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-[16px] font-bold text-primary mt-3 mb-2">
                              {children}
                            </h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-[14px] font-semibold text-primary uppercase mt-2 mb-1">
                              {children}
                            </h3>
                          ),
                          ul: ({ children }) => (
                            <ul className="space-y-1.5 my-2 text-[15px] pl-5 list-disc text-on-surface">
                              {children}
                            </ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="space-y-1.5 my-2 text-[15px] pl-5 list-decimal text-on-surface">
                              {children}
                            </ol>
                          ),
                          li: ({ children }) => (
                            <li className="leading-relaxed text-on-surface">
                              {children}
                            </li>
                          ),
                          table: ({ children }) => (
                            <div className="overflow-x-auto my-4 border border-outline-variant rounded-md bg-[#131315]">
                              <table className="w-full text-left border-collapse text-[14px]">
                                {children}
                              </table>
                            </div>
                          ),
                          thead: ({ children }) => (
                            <thead className="bg-surface-container-low border-b border-outline-variant font-code-sm text-xs font-semibold text-primary uppercase">
                              {children}
                            </thead>
                          ),
                          tbody: ({ children }) => (
                            <tbody className="divide-y divide-outline-variant/40">
                              {children}
                            </tbody>
                          ),
                          tr: ({ children }) => (
                            <tr className="hover:bg-surface-container/50 transition-colors">
                              {children}
                            </tr>
                          ),
                          th: ({ children }) => (
                            <th className="px-4 py-3 font-semibold text-primary">
                              {children}
                            </th>
                          ),
                          td: ({ children }) => (
                            <td className="px-4 py-3 text-on-surface leading-relaxed border-t border-outline-variant/30">
                              {children}
                            </td>
                          ),
                          a: ({ children, href }) => (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary underline hover:text-primary-fixed"
                            >
                              {children}
                            </a>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-semibold text-primary">
                              {children}
                            </strong>
                          ),
                          pre({ children }: any) {
                            const codeChild = children?.props ?? {};
                            const className = codeChild.className || "";
                            const match = /language-(\w+)/.exec(className);
                            const codeString = String(
                              codeChild.children ?? "",
                            ).replace(/\n$/, "");
                            const blockId = `${codeString.length}-${codeString.slice(0, 12)}`;

                            return (
                              <div className="border border-outline-variant rounded-md overflow-hidden bg-[#09090b] my-4">
                                <div className="flex items-center justify-between px-4 py-2 border-b border-outline-variant bg-surface-container-low text-xs font-code-sm text-on-surface-variant">
                                  <span>{match ? match[1] : "code"}</span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleCopyCode(codeString, blockId)
                                    }
                                    className="hover:text-primary uppercase bg-transparent border-none cursor-pointer text-[11px]"
                                  >
                                    {copiedId === blockId ? "Copied" : "Copy"}
                                  </button>
                                </div>
                                <div className="p-4 overflow-x-auto bg-[#09090b]">
                                  <pre className="font-code-sm text-xs leading-relaxed text-[#e5e1e4] m-0">
                                    <code>{codeString}</code>
                                  </pre>
                                </div>
                              </div>
                            );
                          },
                          code({ children }: any) {
                            return (
                              <code className="font-code-sm text-xs bg-surface-container px-1.5 py-0.5 rounded border border-outline-variant text-on-surface font-mono">
                                {children}
                              </code>
                            );
                          },
                        }}
                      >
                        {cleanContent}
                      </ReactMarkdown>

                      {/* Sources */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="pt-2 border-t border-outline-variant space-y-1">
                          <div className="text-[11px] font-code-sm text-outline">
                            Sources:
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {msg.sources.map((src, i) => (
                              <span
                                key={i}
                                className="bg-surface-container border border-outline-variant text-on-surface-variant px-2 py-0.5 rounded text-xs font-code-sm truncate max-w-xs"
                              >
                                {src.split("/").pop()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* User Message */
                  <div className="flex justify-end w-full">
                    <div className="max-w-xl bg-surface-container border border-outline-variant p-4 rounded-md text-[15px] text-on-surface leading-relaxed">
                      <p className="whitespace-pre-wrap m-0">{msg.content}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Loading Indicator */}
        {isChatLoading && (
          <div className="text-xs font-code-sm text-on-surface-variant animate-pulse py-2">
            Generating response...
          </div>
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Minimal Floating Input Tray */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent pointer-events-none z-20">
        <div className="bg-surface border border-outline-variant rounded-md shadow-sm pointer-events-auto max-w-3xl mx-auto w-full p-2 focus-within:border-primary transition-colors">
          <form
            onSubmit={handleSendMessage}
            className="flex items-center gap-3"
          >
            <textarea
              placeholder="Ask a question..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              disabled={isChatLoading}
              rows={2}
              className="flex-1 bg-transparent border-none resize-none font-code-sm text-sm text-on-surface placeholder:text-outline-variant focus:outline-none px-3 py-2 min-h-[44px] max-h-[140px] leading-relaxed overflow-y-auto scrollbar-hide disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isChatLoading || !inputMessage.trim()}
              className="bg-primary text-background font-code-sm text-xs px-5 py-2.5 rounded-md hover:bg-primary-fixed transition-colors font-medium border-none cursor-pointer disabled:opacity-50 shrink-0 self-center"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
