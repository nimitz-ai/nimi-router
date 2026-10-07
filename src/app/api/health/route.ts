import { getProviders, getRouterApiKey } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const providers = getProviders();
  return Response.json({
    ok: true,
    service: "nimi-router",
    providers: providers.length,
    authRequired: getRouterApiKey() !== null,
    time: new Date().toISOString(),
  });
}
