import { dashboardForbidden, hasDashboardSession } from "@/lib/auth";
import { proxyChatCompletion } from "@/lib/router";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Playground endpoint — same router engine as /api/v1, but authenticated
 * via the dashboard session so the API key never touches the browser.
 */
export async function POST(req: Request) {
  if (!(await hasDashboardSession())) return dashboardForbidden();
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  return proxyChatCompletion(body);
}
