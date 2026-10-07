import { dashboardForbidden, hasDashboardSession } from "@/lib/auth";
import { getProviders } from "@/lib/config";

export const dynamic = "force-dynamic";

/** Test a provider's connectivity: GET {baseUrl}/models with its key. */
export async function POST(req: Request) {
  if (!(await hasDashboardSession())) return dashboardForbidden();

  let index = -1;
  try {
    index = Number((await req.json()).index);
  } catch {
    /* ignore */
  }
  const providers = getProviders();
  const p = providers[index];
  if (!p) return Response.json({ ok: false, error: "Unknown provider." }, { status: 400 });

  const started = Date.now();
  try {
    const res = await fetch(`${p.baseUrl}/models`, {
      headers: { Authorization: `Bearer ${p.apiKey}` },
    });
    const ms = Date.now() - started;
    if (res.ok) {
      let count: number | undefined;
      try {
        count = (await res.json())?.data?.length;
      } catch {
        /* ignore */
      }
      return Response.json({ ok: true, latencyMs: ms, models: count });
    }
    return Response.json({ ok: false, error: `HTTP ${res.status}`, latencyMs: ms });
  } catch (e) {
    return Response.json({
      ok: false,
      error: e instanceof Error ? e.message : "network error",
      latencyMs: Date.now() - started,
    });
  }
}
