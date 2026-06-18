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

  async function handleSubmit(e: React.FormEvent) {
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
    <section aria-label="AI Schedule Chat" className="mt-10 rounded-lg border-2 border-gray-200 bg-gray-50 p-5">
      <h2 className="mb-4 text-base font-semibold">Ask about the schedule</h2>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about the schedule"
          disabled={loading}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-gray-100 disabled:text-gray-400"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="rounded bg-gray-800 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {loading ? "Asking…" : "Ask"}
        </button>
      </form>

      {loading && !response && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-3">
          <span className="animate-pulse text-sm text-gray-400">Thinking...</span>
        </div>
      )}

      {response && (
        <div
          role="region"
          aria-label="Chat response"
          className={
            isError
              ? "mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              : "mt-4 rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700"
          }
        >
          {response}
        </div>
      )}
    </section>
  );
}
