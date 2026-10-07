"use client";

import { useRef, useState } from "react";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

export default function PlaygroundClient({ defaultModel }: { defaultModel: string }) {
  const [model, setModel] = useState(defaultModel);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  function scrollDown() {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setError("");
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    scrollDown();

    try {
      const res = await fetch("/api/dashboard/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          stream: true,
        }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message || `HTTP ${res.status}`);
      }

      // Stream SSE chunks into the last assistant message.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const payload = t.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const delta = JSON.parse(payload)?.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              acc += delta;
              const snapshot = acc;
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: snapshot };
                return copy;
              });
            }
          } catch {
            /* partial chunk — ignore */
          }
        }
        scrollDown();
      }
      if (!acc) {
        // Non-streaming fallback: read whole JSON body.
        setMessages((prev) => prev.slice(0, -1));
        setError("Empty response — provider may not support streaming.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && !last.content) return prev.slice(0, -1);
        return prev;
      });
    } finally {
      setLoading(false);
      scrollDown();
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-4xl flex-col">
      <h1 className="mb-1 text-2xl font-bold">Playground</h1>
      <p className="mb-4 text-sm text-zinc-500">
        Test the router end-to-end — requests go through the same fallback engine as the API.
      </p>

      <div className="mb-4 flex gap-2">
        <input
          className="input"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="model name, e.g. gpt-4o-mini"
          spellCheck={false}
        />
        <button onClick={() => setMessages([])} className="btn-ghost shrink-0">
          Clear
        </button>
      </div>

      <div className="card mb-4 flex-1 overflow-y-auto">
        {messages.length === 0 && (
          <div className="py-12 text-center text-sm text-zinc-500">
            No messages yet. Ask something to test your provider chain.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`mb-4 ${m.role === "user" ? "text-right" : ""}`}>
            <div
              className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-xl px-4 py-2 text-left text-sm ${
                m.role === "user" ? "bg-accent text-black" : "bg-zinc-800 text-zinc-100"
              }`}
            >
              {m.content || (loading && i === messages.length - 1 ? "…" : "")}
            </div>
          </div>
        ))}
        {error && (
          <div className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <input
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type a message…"
        />
        <button onClick={send} disabled={loading || !input.trim()} className="btn shrink-0">
          {loading ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}
