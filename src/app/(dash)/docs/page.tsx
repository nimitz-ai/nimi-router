import CopyButton from "@/components/CopyButton";

const PROVIDERS_EXAMPLE = `[
  {
    "name": "OpenAI",
    "baseUrl": "https://api.openai.com/v1",
    "apiKeys": ["sk-aaa", "sk-bbb", "sk-ccc"],
    "models": ["gpt-4o-mini", "gpt-4o"],
    "priority": 1,
    "enabled": true
  },
  {
    "name": "OpenRouter",
    "baseUrl": "https://openrouter.ai/api/v1",
    "apiKey": "sk-or-...",
    "models": ["*"],
    "priority": 2,
    "enabled": true
  }
]`;

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-2xl font-bold">Docs</h1>
      <p className="mb-6 text-sm text-zinc-500">Setup, configuration, and client integration.</p>

      <section className="card mb-6">
        <h2 className="mb-2 text-lg font-semibold">1. Environment variables</h2>
        <p className="mb-3 text-sm text-zinc-400">
          All configuration is via env vars — no database needed. On Vercel, set them under
          Project → Settings → Environment Variables.
        </p>
        <table className="mb-4 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-xs uppercase text-zinc-500">
              <th className="py-2 pr-4">Variable</th>
              <th className="py-2">Purpose</th>
            </tr>
          </thead>
          <tbody className="text-zinc-300">
            <tr className="border-b border-zinc-800/50">
              <td className="py-2 pr-4 font-mono text-xs text-emerald-300">PROVIDERS_JSON</td>
              <td className="py-2 text-xs">JSON array of providers (required). Format below.</td>
            </tr>
            <tr className="border-b border-zinc-800/50">
              <td className="py-2 pr-4 font-mono text-xs text-emerald-300">ROUTER_API_KEY</td>
              <td className="py-2 text-xs">Key clients send as Bearer token. Empty = open access.</td>
            </tr>
            <tr>
              <td className="py-2 pr-4 font-mono text-xs text-emerald-300">DASHBOARD_PASSWORD</td>
              <td className="py-2 text-xs">Password for this dashboard. Empty = no login.</td>
            </tr>
          </tbody>
        </table>
        <div className="mb-2 flex items-center justify-between">
          <div className="label mb-0">PROVIDERS_JSON format</div>
          <CopyButton text={PROVIDERS_EXAMPLE} />
        </div>
        <pre className="code">{PROVIDERS_EXAMPLE}</pre>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-zinc-400">
          <li><code className="inline">models: ["*"]</code> accepts any model name (passthrough).</li>
          <li><code className="inline">priority</code>: lower is tried first.</li>
          <li><code className="inline">apiKeys</code>: multiple keys rotate round-robin; a failing key is cooled down automatically (429 → 60s, 401/403 → 5min). Single <code className="inline">apiKey</code> also works.</li>
          <li>Token usage (prompt/completion/total) is tracked per key, including streaming.</li>
          <li>Any OpenAI-compatible endpoint works: OpenAI, OpenRouter, DeepSeek, GLM, Moonshot, Groq, Together, Ollama…</li>
        </ul>
      </section>

      <section className="card mb-6">
        <h2 className="mb-2 text-lg font-semibold">2. API reference</h2>
        <div className="space-y-3 text-sm">
          <div>
            <code className="inline">POST /api/v1/chat/completions</code>
            <p className="mt-1 text-xs text-zinc-400">
              OpenAI-compatible. Supports <code className="inline">stream: true</code> (SSE). Falls back
              across providers on 429 / 5xx / network errors.
            </p>
          </div>
          <div>
            <code className="inline">GET /api/v1/models</code>
            <p className="mt-1 text-xs text-zinc-400">Aggregated model list from all enabled providers.</p>
          </div>
          <div>
            <code className="inline">GET /api/health</code>
            <p className="mt-1 text-xs text-zinc-400">Health check — no auth required.</p>
          </div>
        </div>
      </section>

      <section className="card mb-6">
        <h2 className="mb-2 text-lg font-semibold">3. Connect a client</h2>
        <p className="mb-2 text-sm text-zinc-400">Any OpenAI SDK works — just point it at the router:</p>
        <pre className="code">{`from openai import OpenAI

client = OpenAI(
    base_url="https://YOUR-APP.vercel.app/api/v1",
    api_key="YOUR_ROUTER_API_KEY",
)

res = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello!"}],
)
print(res.choices[0].message.content)`}</pre>
      </section>

      <section className="card">
        <h2 className="mb-2 text-lg font-semibold">4. Deploy to Vercel</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-zinc-300">
          <li>Push this repo to GitHub.</li>
          <li>On <a href="https://vercel.com/new" target="_blank" rel="noreferrer" className="text-accent underline">vercel.com/new</a>, import the repo.</li>
          <li>Add the environment variables above, then Deploy.</li>
          <li>Open <code className="inline">https://YOUR-APP.vercel.app</code> — done.</li>
        </ol>
        <p className="mt-3 text-xs text-zinc-500">
          Note: request stats are in-memory per serverless instance (they reset on cold starts).
          Provider config comes from env vars, so changes need a redeploy (or update env + redeploy via Vercel).
        </p>
      </section>
    </div>
  );
}
