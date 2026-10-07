"use client";

import { useState } from "react";

export default function TestButton({ index }: { index: number }) {
  const [state, setState] = useState<"idle" | "loading" | "ok" | "fail">("idle");
  const [detail, setDetail] = useState("");

  async function test() {
    setState("loading");
    setDetail("");
    try {
      const res = await fetch("/api/providers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index }),
      });
      const data = await res.json();
      if (data.ok) {
        setState("ok");
        setDetail(`${data.latencyMs}ms${data.models != null ? ` · ${data.models} models` : ""}`);
      } else {
        setState("fail");
        setDetail(data.error || "failed");
      }
    } catch (e) {
      setState("fail");
      setDetail(e instanceof Error ? e.message : "error");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={test} disabled={state === "loading"} className="btn-ghost px-3 py-1 text-xs">
        {state === "loading" ? "Testing…" : "Test connection"}
      </button>
      {state === "ok" && <span className="text-xs text-emerald-400">✓ {detail}</span>}
      {state === "fail" && <span className="text-xs text-red-400">✗ {detail}</span>}
    </div>
  );
}
