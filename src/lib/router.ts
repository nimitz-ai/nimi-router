// Core routing engine: OpenAI-compatible proxy with smart fallback.
// Tries providers in priority order; on retryable failure moves to the next.

import { providersForModel } from "./config";
import { recordRequest } from "./stats";

const RETRYABLE = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

function isRetryable(status: number): boolean {
  if (RETRYABLE.has(status)) return true;
  // 4xx client errors (except those above) are not retryable — except 401/403/404
  // where another provider might have a working key / correct endpoint.
  if (status === 401 || status === 403 || status === 404) return true;
  return false;
}

function errJson(message: string, status: number) {
  return Response.json({ error: { message, type: "router_error" } }, { status });
}

/**
 * Proxy an OpenAI chat-completions body through the provider chain.
 * Returns the upstream Response directly (streaming SSE passes through).
 */
export async function proxyChatCompletion(body: Record<string, unknown>): Promise<Response> {
  const model = String(body.model || "");
  if (!model) return errJson("Missing 'model' in request body.", 400);

  const chain = providersForModel(model);
  if (chain.length === 0) {
    recordRequest({
      time: new Date().toISOString(),
      model,
      provider: "-",
      success: false,
      latencyMs: 0,
      error: "no provider for model",
    });
    return errJson(
      `No enabled provider configured for model "${model}". Check PROVIDERS_JSON.`,
      404
    );
  }

  const failures: string[] = [];
  for (const p of chain) {
    const started = Date.now();
    try {
      const upstream = await fetch(`${p.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${p.apiKey}`,
        },
        body: JSON.stringify(body),
      });
      const latencyMs = Date.now() - started;

      if (!isRetryable(upstream.status)) {
        // Definitive answer (2xx success or non-retryable 4xx) — pass through.
        recordRequest({
          time: new Date().toISOString(),
          model,
          provider: p.name,
          success: upstream.ok,
          latencyMs,
          error: upstream.ok ? undefined : `upstream ${upstream.status}`,
        });
        return upstream;
      }

      // Retryable failure — drain body, log, try next provider.
      const text = await upstream.text().catch(() => "");
      failures.push(`${p.name}: HTTP ${upstream.status}${text ? ` — ${text.slice(0, 120)}` : ""}`);
      recordRequest({
        time: new Date().toISOString(),
        model,
        provider: p.name,
        success: false,
        latencyMs,
        error: `HTTP ${upstream.status}`,
      });
    } catch (e) {
      const latencyMs = Date.now() - started;
      const msg = e instanceof Error ? e.message : String(e);
      failures.push(`${p.name}: ${msg.slice(0, 120)}`);
      recordRequest({
        time: new Date().toISOString(),
        model,
        provider: p.name,
        success: false,
        latencyMs,
        error: "network error",
      });
    }
  }

  return errJson(
    `All ${chain.length} provider(s) failed for model "${model}": ${failures.join(" | ")}`,
    502
  );
}
