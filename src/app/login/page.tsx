"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError("Wrong password.");
      }
    } catch {
      setError("Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-lg font-black text-black">
            n
          </span>
          <span className="text-lg font-bold">
            nimi<span className="text-accent">-router</span>
          </span>
        </div>
        <div className="label">Dashboard password</div>
        <input
          type="password"
          className="input mb-3"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoFocus
        />
        {error && <div className="mb-3 text-sm text-red-400">{error}</div>}
        <button type="submit" disabled={loading} className="btn w-full">
          {loading ? "Checking…" : "Login"}
        </button>
      </form>
    </div>
  );
}
