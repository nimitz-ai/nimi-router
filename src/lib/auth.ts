import { cookies } from "next/headers";
import { getRouterApiKey } from "./config";

export const SESSION_COOKIE = "nimi-session";

/** Check `Authorization: Bearer <ROUTER_API_KEY>` for /api/v1/*. */
export function checkApiKey(req: Request): boolean {
  const required = getRouterApiKey();
  if (!required) return true; // open access when no key configured
  const auth = req.headers.get("authorization") || "";
  // constant-time-ish compare to avoid trivial timing leaks
  const expected = `Bearer ${required}`;
  if (auth.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < auth.length; i++) diff |= auth.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export function unauthorized() {
  return Response.json(
    { error: { message: "Invalid or missing API key.", type: "authentication_error" } },
    { status: 401 }
  );
}

/** Dashboard session check (set after DASHBOARD_PASSWORD login). */
export async function hasDashboardSession(): Promise<boolean> {
  if (!process.env.DASHBOARD_PASSWORD) return true;
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value === "ok";
}

export function dashboardForbidden() {
  return Response.json({ error: "Dashboard login required." }, { status: 403 });
}
