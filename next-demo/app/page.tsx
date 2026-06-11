"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

function createId() {
  return Math.random().toString(36).substring(2, 10);
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(date: Date) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "今天";
  if (date.toDateString() === yesterday.toDateString()) return "昨天";
  return date.toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
  });
}

const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: "1",
    title: "React 性能优化建议",
    messages: [
      {
        id: "m1",
        role: "user",
        content: "我的 React 应用在列表渲染时很卡，有什么优化建议吗？",
        timestamp: new Date(Date.now() - 3600000),
      },
      {
        id: "m2",
        role: "assistant",
        content:
          "针对 React 列表渲染性能问题，以下是一些常见的优化策略：\n\n1. **使用 React.memo**：对列表项组件进行记忆化，避免不必要的重新渲染\n2. **虚拟列表**：使用 react-window 或 react-virtuoso，只渲染可视区域内的元素\n3. **key 属性**：确保使用稳定且唯一的 key，避免使用数组索引\n4. **useMemo / useCallback**：对传递给子组件的 props 进行记忆化\n5. **减少状态层级**：将状态尽量下移到需要的组件中\n\n你可以根据具体场景选择合适的方案，虚拟列表通常是最有效的。",
        timestamp: new Date(Date.now() - 3500000),
      },
    ],
    createdAt: new Date(Date.now() - 3600000),
    updatedAt: new Date(Date.now() - 3500000),
  },
  {
    id: "2",
    title: "Next.js 路由配置",
    messages: [
      {
        id: "m3",
        role: "user",
        content: "Next.js App Router 中如何配置动态路由？",
        timestamp: new Date(Date.now() - 86400000),
      },
      {
        id: "m4",
        role: "assistant",
        content:
          "在 Next.js App Router 中，动态路由通过文件夹命名来配置：\n\n```tsx\napp/blog/[slug]/page.tsx\n```\n\n页面组件接收 `params` 参数：\n\n```tsx\nexport default function BlogPost({ params }: { params: { slug: string } }) {\n  return <h1>文章: {params.slug}</h1>;\n}\n```\n\n还支持捕获所有路由 `[...slug]` 和可选捕获所有路由 `[[...slug]]`。",
        timestamp: new Date(Date.now() - 86000000),
      },
    ],
    createdAt: new Date(Date.now() - 86400000),
    updatedAt: new Date(Date.now() - 86000000),
  },
  {
    id: "3",
    title: "TypeScript 泛型问题",
    messages: [
      {
        id: "m5",
        role: "user",
        content: "如何在 TypeScript 中正确定义一个泛型工具类型？",
        timestamp: new Date(Date.now() - 172800000),
      },
      {
        id: "m6",
        role: "assistant",
        content:
          "TypeScript 泛型工具类型非常强大，以下是一些常用的内置工具类型：\n\n- `Partial<T>` — 将所有属性变为可选\n- `Required<T>` — 将所有属性变为必填\n- `Pick<T, K>` — 从 T 中选取部分属性\n- `Omit<T, K>` — 从 T 中排除部分属性\n- `Record<K, V>` — 构造键值对类型\n\n你也可以自定义泛型工具类型来满足特定需求。",
        timestamp: new Date(Date.now() - 172000000),
      },
    ],
    createdAt: new Date(Date.now() - 172800000),
    updatedAt: new Date(Date.now() - 172000000),
  },
];

export default function Home() {
  const [conversations, setConversations] =
    useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [activeId, setActiveId] = useState<string>("1");
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeConversation = conversations.find((c) => c.id === activeId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages.length, isTyping]);

  function createNewConversation() {
    const newConv: Conversation = {
      id: createId(),
      title: "新的对话",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveId(newConv.id);
    setInputValue("");
    inputRef.current?.focus();
  }

  function deleteConversation(id: string) {
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (id === activeId && next.length > 0) {
        setActiveId(next[0].id);
      } else if (next.length === 0) {
        createNewConversation();
        return next;
      }
      return next;
    });
  }

  function simulateAIReply(convId: string, userMessage: string) {
    setIsTyping(true);
    const delay = 800 + Math.random() * 1200;

    setTimeout(() => {
      const replies: Record<string, string> = {
        default:
          "感谢你的提问！这是一个很好的问题。\n\n让我为你分析一下：\n\n1. 首先，理解问题的核心是关键\n2. 其次，需要考虑不同的解决方案\n3. 最后，选择最适合你场景的方案\n\n如果你需要更详细的解释，请随时告诉我。",
      };

      const reply = replies.default;
      const assistantMsg: Message = {
        id: createId(),
        role: "assistant",
        content: reply,
        timestamp: new Date(),
      };

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== convId) return c;
          const updatedMessages = [...c.messages, assistantMsg];
          return {
            ...c,
            messages: updatedMessages,
            updatedAt: new Date(),
            title:
              c.messages.length === 0
                ? userMessage.slice(0, 20) + (userMessage.length > 20 ? "..." : "")
                : c.title,
          };
        })
      );
      setIsTyping(false);
    }, delay);
  }

  function handleSend() {
    const text = inputValue.trim();
    if (!text || isTyping) return;

    const userMsg: Message = {
      id: createId(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    const targetId = activeId;

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== targetId) return c;
        const updatedMessages = [...c.messages, userMsg];
        return {
          ...c,
          messages: updatedMessages,
          updatedAt: new Date(),
          title:
            c.messages.length === 0
              ? text.slice(0, 20) + (text.length > 20 ? "..." : "")
              : c.title,
        };
      })
    );

    setInputValue("");
    simulateAIReply(targetId, text);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const groupedConversations = conversations.reduce<
    Record<string, Conversation[]>
  >((groups, conv) => {
    const label = formatDate(conv.updatedAt);
    if (!groups[label]) groups[label] = [];
    groups[label].push(conv);
    return groups;
  }, {});

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white dark:bg-zinc-950">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarCollapsed ? "w-0" : "w-72"
        } flex h-full flex-col border-r border-zinc-200 bg-zinc-50 transition-all duration-300 dark:border-zinc-800 dark:bg-zinc-900`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          {!sidebarCollapsed && (
            <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              对话列表
            </h2>
          )}
          <button
            onClick={createNewConversation}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            title="新建对话"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>

        {/* Conversation List */}
        {!sidebarCollapsed && (
          <div className="flex-1 overflow-y-auto px-2 py-2">
            {Object.entries(groupedConversations).map(
              ([groupLabel, convs]) => (
                <div key={groupLabel} className="mb-3">
                  <div className="mb-1 px-2 text-xs font-medium text-zinc-400 dark:text-zinc-500">
                    {groupLabel}
                  </div>
                  {convs.map((conv) => (
                    <div
                      key={conv.id}
                      className={`group relative mb-0.5 flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                        conv.id === activeId
                          ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                          : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800/60"
                      }`}
                      onClick={() => setActiveId(conv.id)}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="shrink-0 opacity-50"
                      >
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      <span className="flex-1 truncate">{conv.title}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conv.id);
                        }}
                        className="invisible absolute right-1 flex h-6 w-6 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-red-500 group-hover:visible dark:hover:bg-zinc-700"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}
      </aside>

      {/* Toggle Sidebar Button */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="absolute left-0 top-4 z-10 flex h-7 w-7 items-center justify-center rounded-r-md border border-l-0 border-zinc-200 bg-zinc-50 text-zinc-400 shadow-sm transition-all hover:text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:text-zinc-300"
        style={{ left: sidebarCollapsed ? 0 : 288 }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: sidebarCollapsed ? "rotate(180deg)" : "none",
          }}
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      {/* Main Chat Area */}
      <main className="flex flex-1 flex-col">
        {/* Chat Header */}
        <header className="flex items-center justify-between border-b border-zinc-200 bg-white/80 px-6 py-3 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
                <path d="M9 21h6M10 17v4M14 17v4" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                AI 助手
              </h1>
              <p className="text-xs text-zinc-400">
                {activeConversation
                  ? `${activeConversation.messages.length} 条消息`
                  : "新对话"}
              </p>
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {!activeConversation ||
          activeConversation.messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
                  <path d="M9 21h6M10 17v4M14 17v4" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">
                  开始新的对话
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  输入你的问题，AI 助手将为你解答
                </p>
              </div>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {[
                  "解释什么是 React Server Components",
                  "帮我写一个 TypeScript 工具类型",
                  "如何优化 Web 应用性能",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setInputValue(suggestion);
                      inputRef.current?.focus();
                    }}
                    className="rounded-full border border-zinc-200 px-4 py-2 text-xs text-zinc-500 transition-colors hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-6">
              {activeConversation.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
                        <path d="M9 21h6M10 17v4M14 17v4" />
                      </svg>
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    <div
                      className={`mt-2 text-xs ${
                        msg.role === "user"
                          ? "text-blue-200"
                          : "text-zinc-400 dark:text-zinc-500"
                      }`}
                    >
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                  {msg.role === "user" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-zinc-500 dark:text-zinc-400"
                      >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
                      <path d="M9 21h6M10 17v4M14 17v4" />
                    </svg>
                  </div>
                  <div className="rounded-2xl bg-zinc-100 px-4 py-3 dark:bg-zinc-800">
                    <div className="flex gap-1.5">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-zinc-200 bg-white/80 px-4 py-4 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
          <div className="mx-auto flex max-w-3xl items-end gap-3">
            <div className="flex flex-1 items-end rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2 transition-colors focus-within:border-blue-400 focus-within:bg-white dark:border-zinc-700 dark:bg-zinc-900 dark:focus-within:border-blue-500 dark:focus-within:bg-zinc-950">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入消息..."
                rows={1}
                className="max-h-32 min-h-[24px] flex-1 resize-none bg-transparent text-sm text-zinc-800 outline-none placeholder:text-zinc-400 dark:text-zinc-200 dark:placeholder:text-zinc-500"
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = target.scrollHeight + "px";
                }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isTyping}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 2L11 13" />
                <path d="M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>
          <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-zinc-400">
            AI 助手可能会出错，请核实重要信息
          </p>
        </div>
      </main>
    </div>
  );
}
