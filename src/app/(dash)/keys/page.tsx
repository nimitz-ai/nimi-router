import { headers } from "next/headers";
import { getRouterApiKey, maskSecret } from "@/lib/config";
import CopyButton from "@/components/CopyButton";

export const dynamic = "force-dynamic";

export default async function KeysPage() {
  const key = getRouterApiKey();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "your-domain.vercel.app";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const base = `${proto}://${host}`;

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-2xl font-bold">API Keys</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Clients authenticate to the router with the key below.
      </p>

      <div className="card mb-6">
        <div className="label">Router API key</div>
        {key ? (
          <div className="flex items-center gap-3">
            <code className="flex-1 rounded bg-black px-3 py-2 font-mono text-sm text-emerald-300">
              {maskSecret(key)}
            </code>
            <CopyButton text={key} />
          </div>
        ) : (
          <div className="text-sm text-amber-300">
            No <code className="inline">ROUTER_API_KEY</code> set — the API is currently open to anyone.
            Set one in your environment variables.
          </div>
        )}
        <p className="mt-2 text-xs text-zinc-500">
          Send as <code className="inline">Authorization: Bearer &lt;key&gt;</code> header.
        </p>
      </div>

      <div className="card">
        <div className="label">Base URL</div>
        <div className="flex items-center gap-3">
          <code className="flex-1 rounded bg-black px-3 py-2 font-mono text-sm text-emerald-300">
            {base}/api/v1
          </code>
          <CopyButton text={`${base}/api/v1`} />
        </div>

        <div className="label mt-4">Quick test (curl)</div>
        <pre className="code">{`curl ${base}/api/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${key ? maskSecret(key) : "YOUR_KEY"}" \\
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"hi"}]}'`}</pre>
      </div>
    </div>
  );
}
