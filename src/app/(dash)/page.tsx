import { getProviders, maskSecret } from "@/lib/config";
import { getStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-1 text-3xl font-bold">{value}</div>
      {sub && <div className="mt-1 text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}

export default function OverviewPage() {
  const stats = getStats();
  const providers = getProviders();

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-1 text-2xl font-bold">Overview</h1>
      <p className="mb-6 text-sm text-zinc-500">
        OpenAI-compatible router — requests fan out to providers in priority order with automatic fallback.
      </p>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total requests" value={String(stats.totalRequests)} sub="this instance" />
        <StatCard label="Success rate" value={`${stats.successRate}%`} />
        <StatCard label="Avg latency" value={`${stats.avgLatencyMs}ms`} sub="upstream round-trip" />
        <StatCard
          label="Providers"
          value={`${providers.filter((p) => p.enabled).length}/${providers.length}`}
          sub="enabled / configured"
        />
      </div>

      <h2 className="mb-3 text-lg font-semibold">Providers</h2>
      <div className="mb-8 grid gap-4 md:grid-cols-2">
        {providers.length === 0 && (
          <div className="card text-sm text-zinc-400">
            No providers configured. Set <code className="inline">PROVIDERS_JSON</code> in your
            environment — see <a href="/docs" className="text-accent underline">Docs</a>.
          </div>
        )}
        {providers.map((p) => {
          const c = stats.providers.find((s) => s.name === p.name);
          return (
            <div key={p.name} className="card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${p.enabled ? "bg-emerald-400" : "bg-zinc-600"}`} />
                  <span className="font-semibold">{p.name}</span>
                </div>
                <span className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-xs text-zinc-400">
                  #{p.priority}
                </span>
              </div>
              <div className="mt-2 truncate font-mono text-xs text-zinc-500">{p.baseUrl}</div>
              <div className="mt-1 font-mono text-xs text-zinc-500">key: {maskSecret(p.apiKey)}</div>
              <div className="mt-3 flex flex-wrap gap-1">
                {p.models.slice(0, 6).map((m) => (
                  <span key={m} className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-xs text-zinc-300">
                    {m}
                  </span>
                ))}
                {p.models.length > 6 && (
                  <span className="px-1 text-xs text-zinc-500">+{p.models.length - 6} more</span>
                )}
              </div>
              {c && (
                <div className="mt-3 border-t border-zinc-800 pt-2 text-xs text-zinc-500">
                  {c.requests} req · {c.success} ok · {c.failed} failed · {c.avgLatencyMs}ms avg
                </div>
              )}
            </div>
          );
        })}
      </div>

      <h2 className="mb-3 text-lg font-semibold">Recent requests</h2>
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-xs uppercase text-zinc-500">
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Model</th>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">Latency</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {stats.recent.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">
                  No requests yet — try the <a href="/playground" className="text-accent underline">Playground</a>.
                </td>
              </tr>
            )}
            {stats.recent.map((r, i) => (
              <tr key={i} className="border-b border-zinc-800/50 last:border-0">
                <td className="px-4 py-2 font-mono text-xs text-zinc-500">
                  {new Date(r.time).toLocaleTimeString()}
                </td>
                <td className="px-4 py-2 font-mono text-xs">{r.model}</td>
                <td className="px-4 py-2 text-xs">{r.provider}</td>
                <td className="px-4 py-2 font-mono text-xs">{r.latencyMs}ms</td>
                <td className="px-4 py-2">
                  {r.success ? (
                    <span className="text-emerald-400">✓ ok</span>
                  ) : (
                    <span className="text-red-400" title={r.error}>✗ {r.error || "failed"}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
