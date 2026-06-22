"use client";

import { useState, useRef, useEffect } from "react";

// Mirrors FamilyScheduleEntry / ScheduleEvent from services.ts — defined here
// to avoid importing from a server-only module in a client component.
type ScheduleEvent = {
  title: string;
  start: string;
  end: string;
  isAllDay: boolean;
};

type ScheduleEntry = {
  userId: string;
  status: "connected" | "unavailable";
  events: ScheduleEvent[];
};

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Props = {
  familyGroupId?: string;
  familyName?: string;
  schedule?: ScheduleEntry[];
};

const MAX_TEXTAREA_HEIGHT = 120; // ~5 lines

export function ChatWidget({ familyGroupId, familyName, schedule }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [hasError, setHasError] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  // Scroll the thread container to the bottom whenever visible content changes.
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streamingContent, hasError]);

  function adjustTextareaHeight() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT) + "px";
  }

  async function handleSubmit() {
    const trimmed = input.trim();
    if (!trimmed || isStreaming || !familyGroupId) return;

    const userMessage: Message = { role: "user", content: trimmed };
    const nextMessages: Message[] = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setHasError(false);
    setIsStreaming(true);
    setStreamingContent("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          familyGroupId,
          familyName: familyName ?? "Family",
          // Pass the server-fetched 90-day schedule so the API skips re-fetching.
          schedule: schedule ?? [],
        }),
      });

      if (!res.ok) {
        setHasError(true);
        setIsStreaming(false);
        return;
      }

      // Vercel AI SDK text stream: lines prefixed with "0:<json-string>\n"
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (line.startsWith("0:")) {
            try {
              const text = JSON.parse(line.slice(2)) as string;
              accumulated += text;
              setStreamingContent(accumulated);
            } catch {
              // Skip malformed chunks — partial reads can split JSON tokens.
            }
          }
        }
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: accumulated },
      ]);
    } catch {
      setHasError(true);
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  }

  return (
    <section
      aria-label="AI Schedule Chat"
      className="mt-10 flex flex-col rounded-[10px] p-6 lg:mt-0 lg:min-h-[34rem]"
      style={{
        background:
          "linear-gradient(135deg, #1e1510 0%, #1a1520 50%, #141020 100%)",
        border: "1px solid rgba(124, 92, 191, 0.30)",
      }}
    >
      <h2 className="mb-4 text-base font-semibold text-primary">
        Ask about the schedule
      </h2>

      {/* Scrollable chat thread */}
      <div
        ref={threadRef}
        data-testid="chat-thread"
        className="mb-4 max-h-120 overflow-y-auto space-y-3 lg:max-h-none lg:flex-1"
      >
        {/* Completed message turns */}
        {messages.map((msg, i) =>
          msg.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div
                data-testid="user-message"
                className="max-w-[75%] rounded-2xl rounded-tr-sm px-4 py-2 text-sm"
                style={{
                  backgroundColor: "#92400e",
                  color: "#fef3c7",
                }}
              >
                {msg.content}
              </div>
            </div>
          ) : (
            <div key={i} className="flex justify-start">
              <div
                data-testid="ai-message"
                className="max-w-[75%] rounded-2xl rounded-tl-sm px-4 py-2 text-sm"
                style={{
                  backgroundColor: "#1e1b16",
                  border: "1px solid rgba(255, 220, 160, 0.08)",
                  color: "#c8bfb0",
                }}
              >
                {msg.content}
              </div>
            </div>
          )
        )}

        {/* Thinking indicator — visible before the first streaming token arrives */}
        {isStreaming && streamingContent === "" && (
          <div className="flex justify-start">
            <div
              data-testid="thinking-indicator"
              className="rounded-2xl rounded-tl-sm px-4 py-3"
              style={{
                backgroundColor: "#1e1b16",
                border: "1px solid rgba(255, 220, 160, 0.08)",
              }}
            >
              <span className="flex gap-1 items-center">
                <span
                  className="animate-bounce text-muted text-lg leading-none"
                  style={{ animationDelay: "0ms" }}
                >
                  •
                </span>
                <span
                  className="animate-bounce text-muted text-lg leading-none"
                  style={{ animationDelay: "150ms" }}
                >
                  •
                </span>
                <span
                  className="animate-bounce text-muted text-lg leading-none"
                  style={{ animationDelay: "300ms" }}
                >
                  •
                </span>
              </span>
            </div>
          </div>
        )}

        {/* Streaming AI response — replaces indicator once text arrives */}
        {isStreaming && streamingContent !== "" && (
          <div className="flex justify-start">
            <div
              data-testid="ai-message"
              className="max-w-[75%] rounded-2xl rounded-tl-sm px-4 py-2 text-sm"
              style={{
                backgroundColor: "#1e1b16",
                border: "1px solid rgba(255, 220, 160, 0.08)",
                color: "#c8bfb0",
              }}
            >
              {streamingContent}
            </div>
          </div>
        )}

        {/* Error bubble — left-aligned, distinct red border */}
        {hasError && (
          <div className="flex justify-start">
            <div
              data-testid="error-message"
              className="max-w-[75%] rounded-2xl rounded-tl-sm px-4 py-2 text-sm"
              style={{
                backgroundColor: "#1e1b16",
                border: "1px solid rgba(192, 57, 43, 0.50)",
                color: "#c0392b",
              }}
            >
              Something went wrong — please try again.
            </div>
          </div>
        )}
      </div>

      {/* Input row */}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            adjustTextareaHeight();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about the schedule"
          disabled={isStreaming}
          rows={1}
          className="flex-1 resize-none overflow-y-auto rounded-lg px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-ai/60 disabled:opacity-50"
          style={{
            backgroundColor: "#1e1b16",
            border: "1px solid rgba(124, 92, 191, 0.30)",
            maxHeight: `${MAX_TEXTAREA_HEIGHT}px`,
          }}
        />
        <button
          data-testid="send-button"
          onClick={() => void handleSubmit()}
          disabled={isStreaming || !input.trim() || !familyGroupId}
          className="rounded-lg bg-ai px-4 py-2 text-sm font-medium text-white hover:bg-ai-hover disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </section>
  );
}
