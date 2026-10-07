import { dashboardForbidden, hasDashboardSession } from "@/lib/auth";
import { getStats } from "@/lib/stats";
import { isCooling, cooldownMs } from "@/lib/keypool";
import { maskSecret } from "@/lib/config";

export const dynamic = "force-dynamic";

/**
 * Dashboard stats API. Route handlers share module state with the router,
 * so stats/cooling are accurate here (RSC pages must fetch this endpoint —
 * they run in a separate module graph under Turbopack).
 */
export async function GET() {
  if (!(await hasDashboardSession())) return dashboardForbidden();
  const s = getStats();
  return Response.json({
    ...s,
    keys: s.keys.map((k) => ({
      provider: k.provider,
      keyMasked: maskSecret(k.key),
      requests: k.requests,
      success: k.success,
      failed: k.failed,
      promptTokens: k.promptTokens,
      completionTokens: k.completionTokens,
      totalTokens: k.totalTokens,
      avgLatencyMs: k.avgLatencyMs,
      cooling: isCooling(k.provider, k.key),
      cooldownMs: cooldownMs(k.provider, k.key),
      lastError: k.lastError,
    })),
  });
}
