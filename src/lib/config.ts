// Provider configuration — loaded from environment variables.
// Works on Vercel (serverless) with zero database needed.

export interface ProviderConfig {
  name: string;
  baseUrl: string;
  apiKey: string;
  /** Explicit model list, or ["*"] to accept any model (passthrough). */
  models: string[];
  /** Lower = tried first. */
  priority: number;
  enabled: boolean;
}

function parseProviders(): ProviderConfig[] {
  const raw = process.env.PROVIDERS_JSON;
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .map((p: Record<string, unknown>, i: number) => ({
        name: String(p.name || `provider-${i + 1}`),
        baseUrl: String(p.baseUrl || "").replace(/\/+$/, ""),
        apiKey: String(p.apiKey || ""),
        models: Array.isArray(p.models) && p.models.length > 0 ? (p.models as string[]) : ["*"],
        priority: typeof p.priority === "number" ? p.priority : i,
        enabled: p.enabled !== false,
      }))
      .filter((p) => p.baseUrl && p.apiKey)
      .sort((a, b) => a.priority - b.priority);
  } catch {
    return [];
  }
}

export function getProviders(): ProviderConfig[] {
  return parseProviders();
}

/** Providers able to serve `model`, in fallback order. */
export function providersForModel(model: string): ProviderConfig[] {
  return getProviders().filter(
    (p) => p.enabled && (p.models.includes("*") || p.models.includes(model))
  );
}

/** API key clients must send as `Authorization: Bearer <key>`. Null = open access. */
export function getRouterApiKey(): string | null {
  return process.env.ROUTER_API_KEY || null;
}

/** Mask a secret for display: sk-abc...xyz */
export function maskSecret(s: string): string {
  if (s.length <= 8) return "••••••••";
  return `${s.slice(0, 6)}••••${s.slice(-4)}`;
}
