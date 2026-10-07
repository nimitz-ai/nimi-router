import { getProviders, maskSecret } from "@/lib/config";
import TestButton from "@/components/TestButton";

export const dynamic = "force-dynamic";

export default function ProvidersPage() {
  const providers = getProviders();

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-1 text-2xl font-bold">Providers</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Configured via <code className="inline">PROVIDERS_JSON</code>. Lower priority number = tried first.
        On failure the router automatically falls back to the next provider.
      </p>

      {providers.length === 0 && (
        <div className="card text-sm text-zinc-400">
          No providers configured yet. Add <code className="inline">PROVIDERS_JSON</code> to your
          environment variables — see <a href="/docs" className="text-accent underline">Docs</a> for the format.
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

            <div className="mt-4 grid gap-4 text-sm md:grid-cols-3">
              <div>
                <div className="label">API key</div>
                <div className="font-mono text-xs">{maskSecret(p.apiKey)}</div>
              </div>
              <div>
                <div className="label">Status</div>
                <div className="text-xs">{p.enabled ? "Enabled" : "Disabled"}</div>
              </div>
              <div>
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
          </div>
        ))}
      </div>

      <div className="card mt-6 text-sm text-zinc-400">
        <div className="mb-2 font-semibold text-zinc-200">How fallback works</div>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Request arrives at <code className="inline">POST /api/v1/chat/completions</code> with a model name.</li>
          <li>Router finds enabled providers serving that model, ordered by priority.</li>
          <li>Tries each in order. On 429 / 5xx / network error / bad key, it moves to the next.</li>
          <li>Streaming (SSE) responses pass straight through from the winning provider.</li>
        </ol>
      </div>
    </div>
  );
}
