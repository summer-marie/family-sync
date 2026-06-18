"use client";

import { useState } from "react";

type Props = {
  familyGroupId?: string;
};

export function ChatWidget({ familyGroupId }: Props) {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!question.trim() || loading) return;

    setLoading(true);
    setResponse("");
    setIsError(false);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, familyGroupId }),
      });

      if (!res.ok) {
        setIsError(true);
        setResponse("Something went wrong. Please try again.");
        return;
      }

      const contentType = res.headers.get("content-type") ?? "";

      if (contentType.includes("application/json")) {
        // Out-of-scope fallback or error — route returned JSON, not a stream
        const data = (await res.json()) as { message?: string };
        setResponse(data.message ?? "Sorry, I could not process that question.");
      } else {
        // Vercel AI SDK data stream: lines prefixed with "0:<json-string>\n"
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
                setResponse(accumulated);
              } catch {
                // Skip malformed chunks — partial reads can split JSON tokens
              }
            }
          }
        }
      }
    } catch {
      setIsError(true);
      setResponse("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      aria-label="AI Schedule Chat"
      className="mt-10 rounded-[10px] p-6"
      style={{
        background:
          "linear-gradient(135deg, #1e1510 0%, #1a1520 50%, #141020 100%)",
        border: "1px solid rgba(124, 92, 191, 0.30)",
      }}
    >
      <h2 className="mb-4 text-base font-semibold text-primary">
        Ask about the schedule
      </h2>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about the schedule"
          disabled={loading}
          className="flex-1 rounded-lg px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-ai/60 disabled:opacity-50"
          style={{
            backgroundColor: "#1e1b16",
            border: "1px solid rgba(124, 92, 191, 0.30)",
          }}
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="rounded-lg bg-ai px-4 py-2 text-sm font-medium text-white hover:bg-ai-hover disabled:opacity-50"
        >
          {loading ? "Asking…" : "Ask"}
        </button>
      </form>

      {loading && !response && (
        <div
          className="mt-4 rounded-[10px] p-3"
          style={{
            backgroundColor: "#1e1b16",
            border: "1px solid rgba(255, 220, 160, 0.08)",
          }}
        >
          <span className="animate-pulse text-sm text-muted">Thinking...</span>
        </div>
      )}

      {response && (
        <div
          role="region"
          aria-label="Chat response"
          className="mt-4 rounded-[10px] p-3 text-sm"
          style={
            isError
              ? {
                  backgroundColor: "#1e1b16",
                  border: "1px solid rgba(192, 57, 43, 0.30)",
                  color: "#c0392b",
                }
              : {
                  backgroundColor: "#1e1b16",
                  border: "1px solid rgba(255, 220, 160, 0.08)",
                  color: "#c8bfb0",
                }
          }
        >
          {response}
        </div>
      )}
    </section>
  );
}
