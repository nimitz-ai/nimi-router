import Link from "next/link";
import { getProviders, maskSecret } from "@/lib/config";
import { fetchStats, fmt } from "@/lib/dash";
import TestButton from "@/components/TestButton";

export const dynamic = "force-dynamic";

export default async function ProvidersPage() {
  const providers = getProviders();
  const stats = await fetchStats();

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-1 text-2xl font-bold">Providers</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Configured via <code className="inline">PROVIDERS_JSON</code>. Each provider can hold{" "}
        <b>multiple API keys</b> — requests rotate across keys (round-robin); a key that hits
        429 / 401 / 5xx is cooled down automatically and traffic moves to healthy keys.
      </p>

      {providers.length === 0 && (
        <div className="card text-sm text-zinc-400">
          No providers configured yet. Add <code className="inline">PROVIDERS_JSON</code> to your
          environment variables — see <Link href="/docs" className="text-accent underline">Docs</Link> for the format.
        </div>
      )}

      <div className="grid gap-4">
        {providers.map((p, i) => (
          <div key={p.name} className="card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className={`h-3 w-3 rounded-full ${p.enabled ? "bg-emerald-400" : "bg-zinc-600"}`} />
                <div>
                  <div className="font-semibold">
                    {p.name}{" "}
                    <span className="ml-1 rounded bg-zinc-800 px-2 py-0.5 font-mono text-xs text-zinc-400">
                      priority {p.priority}
                    </span>
                  </div>
                  <div className="font-mono text-xs text-zinc-500">{p.baseUrl}</div>
                </div>
              </div>
              <TestButton index={i} />
            </div>

            <div className="label mt-4">API keys ({p.apiKeys.length}) — token usage</div>
            <div className="overflow-x-auto rounded-lg border border-zinc-800">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs uppercase text-zinc-500">
                    <th className="px-3 py-2">Key</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Requests</th>
                    <th className="px-3 py-2">Tokens in/out</th>
                    <th className="px-3 py-2">Avg latency</th>
                    <th className="px-3 py-2">Last error</th>
                  </tr>
                </thead>
                <tbody>
                  {p.apiKeys.map((k) => {
                    const masked = maskSecret(k);
                    const ks = stats?.keys.find((s) => s.provider === p.name && s.keyMasked === masked);
                    return (
                      <tr key={masked} className="border-b border-zinc-800/50 font-mono text-xs last:border-0">
                        <td className="px-3 py-2 text-zinc-300">{masked}</td>
                        <td className="px-3 py-2">
                          {ks?.cooling ? (
                            <span className="text-amber-300">⏳ cooldown {Math.ceil((ks.cooldownMs ?? 0) / 1000)}s</span>
                          ) : (
                            <span className="text-emerald-400">● active</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {ks ? `${ks.requests} (${ks.success} ok)` : "—"}
                        </td>
                        <td className="px-3 py-2">
                          {ks ? `${fmt(ks.promptTokens)} / ${fmt(ks.completionTokens)}` : "—"}
                        </td>
                        <td className="px-3 py-2">{ks ? `${ks.avgLatencyMs}ms` : "—"}</td>
                        <td className="px-3 py-2 text-red-400">{ks?.lastError ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4">
              <div className="label">Models ({p.models.length})</div>
              <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto">
                {p.models.map((m) => (
                  <span key={m} className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-xs text-zinc-300">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card mt-6 text-sm text-zinc-400">
        <div className="mb-2 font-semibold text-zinc-200">How routing works</div>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Request arrives at <code className="inline">POST /api/v1/chat/completions</code> with a model name.</li>
          <li>Router finds enabled providers serving that model, ordered by priority.</li>
          <li>Inside a provider, keys are tried <b>round-robin</b> — spreading quota usage across accounts.</li>
          <li>On 429 the key cools down 60s; on 401/403 for 5 min; on 5xx/network 30s. Traffic shifts to healthy keys automatically.</li>
          <li>Token usage (<code className="inline">prompt / completion / total</code>) is captured per key, including streaming responses.</li>
        </ol>
      </div>
    </div>
  );
}
