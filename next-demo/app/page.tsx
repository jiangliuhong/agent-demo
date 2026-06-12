"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface Conversation {
  id: string;
  title: string;
  model: string;
  created_at: string;
  updated_at: string;
  messages?: Message[];
}

function createId() {
  return Math.random().toString(36).substring(2, 10);
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "今天";
  if (d.toDateString() === yesterday.toDateString()) return "昨天";
  return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("gpt-4o-mini");
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  // Close model dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        modelDropdownRef.current &&
        !modelDropdownRef.current.contains(e.target as Node)
      ) {
        setModelDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isTyping, streamingContent]);

  // Load conversations and models on mount
  useEffect(() => {
    async function init() {
      try {
        const [convRes, modelRes] = await Promise.all([
          fetch("/api/conversations"),
          fetch("/api/models"),
        ]);
        const convData: Conversation[] = await convRes.json();
        const modelData: { models: string[]; default: string } =
          await modelRes.json();

        setConversations(convData);
        setModels(modelData.models);
        setSelectedModel(modelData.default);

        // Auto-select the first conversation if exists
        if (convData.length > 0) {
          setActiveId(convData[0].id);
          loadMessages(convData[0].id);
        }
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  async function loadMessages(convId: string) {
    try {
      const res = await fetch(`/api/conversations/${convId}`);
      const data: Conversation = await res.json();
      setMessages(data.messages || []);
    } catch {
      setMessages([]);
    }
  }

  function switchConversation(id: string) {
    if (id === activeId) return;
    setActiveId(id);
    loadMessages(id);
  }

  async function createNewConversation() {
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: selectedModel }),
      });
      const conv: Conversation = await res.json();
      setConversations((prev) => [conv, ...prev]);
      setActiveId(conv.id);
      setMessages([]);
      setInputValue("");
      inputRef.current?.focus();
    } catch (err) {
      console.error("Failed to create conversation:", err);
    }
  }

  async function deleteConversation(id: string) {
    try {
      await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      setConversations((prev) => {
        const next = prev.filter((c) => c.id !== id);
        if (id === activeId) {
          if (next.length > 0) {
            setActiveId(next[0].id);
            loadMessages(next[0].id);
          } else {
            setActiveId(null);
            setMessages([]);
          }
        }
        return next;
      });
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  }

  async function changeModel(model: string) {
    setSelectedModel(model);
    setModelDropdownOpen(false);
    // Update current conversation's model if one is active
    if (activeId) {
      try {
        await fetch(`/api/conversations/${activeId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model }),
        });
      } catch {
        // Non-critical, ignore
      }
    }
  }

  function handleStopStreaming() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }

  const sendToAI = useCallback(
    async (convId: string, userMessage: string) => {
      setIsTyping(true);
      setStreamingContent("");

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Determine model from the current conversation
      const currentConv = conversations.find((c) => c.id === convId);
      const model = currentConv?.model || selectedModel;

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: convId,
            userMessage,
            model,
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          const errorMsg =
            errorData?.error || `请求失败 (${response.status})`;
          throw new Error(errorMsg);
        }

        if (!response.body) {
          throw new Error("响应流不可用");
        }

        // Read plain text stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;
          setStreamingContent(accumulated);
        }

        // Save assistant message to DB
        const assistantMsgId = createId();
        try {
          await fetch(`/api/conversations/${convId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: assistantMsgId,
              role: "assistant",
              content: accumulated,
            }),
          });
        } catch {
          // Non-critical
        }

        // Update local state
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMsgId,
            role: "assistant",
            content: accumulated,
            created_at: new Date().toISOString(),
          },
        ]);
        touchConversationInList(convId);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          // Save partial content
          const partialContent = streamingContent;
          if (partialContent) {
            const msgId = createId();
            try {
              await fetch(`/api/conversations/${convId}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  id: msgId,
                  role: "assistant",
                  content: partialContent,
                }),
              });
            } catch {
              // Non-critical
            }
            setMessages((prev) => [
              ...prev,
              {
                id: msgId,
                role: "assistant",
                content: partialContent,
                created_at: new Date().toISOString(),
              },
            ]);
          }
        } else {
          const errorMessage =
            err instanceof Error ? err.message : "发生未知错误";
          setMessages((prev) => [
            ...prev,
            {
              id: createId(),
              role: "assistant",
              content: `[错误] ${errorMessage}`,
              created_at: new Date().toISOString(),
            },
          ]);
        }
      } finally {
        setIsTyping(false);
        setStreamingContent("");
        abortControllerRef.current = null;
      }
    },
    [conversations, selectedModel, streamingContent]
  );

  function touchConversationInList(convId: string) {
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === convId);
      if (idx === -1) return prev;
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        updated_at: new Date().toISOString(),
      };
      // Re-sort by updated_at DESC
      updated.sort(
        (a, b) =>
          new Date(b.updated_at).getTime() -
          new Date(a.updated_at).getTime()
      );
      return updated;
    });
  }

  async function handleSend() {
    const text = inputValue.trim();
    if (!text || isTyping) return;

    let targetId = activeId;

    // Create a new conversation if none is active
    if (!targetId) {
      try {
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: selectedModel }),
        });
        const conv: Conversation = await res.json();
        setConversations((prev) => [conv, ...prev]);
        setActiveId(conv.id);
        targetId = conv.id;
      } catch {
        return;
      }
    }

    // Optimistically add user message to local state
    const userMsgId = createId();
    const userMsg: Message = {
      id: userMsgId,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // Save user message to DB
    try {
      await fetch(`/api/conversations/${targetId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: userMsgId,
          role: "user",
          content: text,
        }),
      });
    } catch {
      // Non-critical
    }

    // Update title if it's the first message
    const currentConv = conversations.find((c) => c.id === targetId);
    if (!currentConv || currentConv.title === "新的对话") {
      const newTitle =
        text.slice(0, 20) + (text.length > 20 ? "..." : "");
      setConversations((prev) =>
        prev.map((c) =>
          c.id === targetId ? { ...c, title: newTitle } : c
        )
      );
      try {
        await fetch(`/api/conversations/${targetId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newTitle }),
        });
      } catch {
        // Non-critical
      }
    }

    setInputValue("");
    sendToAI(targetId, text);
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
    const label = formatDate(conv.updated_at);
    if (!groups[label]) groups[label] = [];
    groups[label].push(conv);
    return groups;
  }, {});

  const displayContent = isTyping ? streamingContent : null;

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white dark:bg-zinc-950">
        <div className="flex items-center gap-3 text-zinc-400">
          <svg
            className="h-5 w-5 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span className="text-sm">加载中...</span>
        </div>
      </div>
    );
  }

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
                      onClick={() => switchConversation(conv.id)}
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
            {conversations.length === 0 && (
              <div className="px-3 py-8 text-center text-xs text-zinc-400">
                暂无对话，点击上方按钮新建
              </div>
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
                {isTyping
                  ? "正在输入..."
                  : activeId
                    ? `${messages.length} 条消息`
                    : "新对话"}
              </p>
            </div>
          </div>

          {/* Model Selector */}
          <div ref={modelDropdownRef} className="relative">
            <button
              onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
              className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 6V2m0 0L8 6m4-4l4 4" />
                <path d="M12 18v4m0 0l4-4m-4 4l-4-4" />
                <rect x="4" y="8" width="16" height="8" rx="2" />
                <text
                  x="12"
                  y="14"
                  textAnchor="middle"
                  fontSize="7"
                  fill="currentColor"
                  stroke="none"
                >
                  AI
                </text>
              </svg>
              <span>{selectedModel}</span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {modelDropdownOpen && models.length > 0 && (
              <div className="absolute right-0 top-full z-20 mt-1 min-w-[180px] rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
                <div className="px-3 py-1.5 text-xs font-medium text-zinc-400">
                  选择模型
                </div>
                {models.map((model) => (
                  <button
                    key={model}
                    onClick={() => changeModel(model)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                      model === selectedModel
                        ? "bg-blue-50 font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                        : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {model === selectedModel && (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                    <span className={model !== selectedModel ? "ml-[14px]" : ""}>
                      {model}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {!activeId || messages.length === 0 ? (
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
              {messages.map((msg) => (
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
                      {formatTime(msg.created_at)}
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

              {/* Streaming message */}
              {isTyping && displayContent && (
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
                  <div className="max-w-[75%] rounded-2xl bg-zinc-100 px-4 py-3 text-sm leading-relaxed text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                    <div className="whitespace-pre-wrap">
                      {displayContent}
                      <span className="inline-block h-4 w-0.5 animate-pulse bg-zinc-400 dark:bg-zinc-300" />
                    </div>
                  </div>
                </div>
              )}

              {/* Typing indicator (before content arrives) */}
              {isTyping && !displayContent && (
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
            {isTyping ? (
              <button
                onClick={handleStopStreaming}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500 text-white transition-colors hover:bg-red-600"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!inputValue.trim()}
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
            )}
          </div>
          <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-zinc-400">
            当前模型: {selectedModel} | AI 助手可能会出错，请核实重要信息
          </p>
        </div>
      </main>
    </div>
  );
}
