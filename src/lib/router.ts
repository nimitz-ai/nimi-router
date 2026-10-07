// Core routing engine: OpenAI-compatible proxy with smart fallback.
// Provider chain (priority) -> key rotation (round-robin) with auto-cooldown.
// Token usage is captured for both streaming and non-streaming responses.

import { providersForModel, maskSecret, type ProviderConfig } from "./config";
import { orderedKeys, cooldownKey } from "./keypool";
import { recordRequest, addTokens, type TokenUsage } from "./stats";

const RETRYABLE = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

function isRetryable(status: number): boolean {
  if (RETRYABLE.has(status)) return true;
  // Another key/provider may have a working credential or correct endpoint.
  if (status === 401 || status === 403 || status === 404) return true;
  return false;
}

function errJson(message: string, status: number) {
  return Response.json({ error: { message, type: "router_error" } }, { status });
}

function toUsage(u: unknown): TokenUsage | null {
  if (!u || typeof u !== "object") return null;
  const o = u as Record<string, unknown>;
  const total = Number(o.total_tokens ?? 0);
  if (!total) return null;
  return {
    prompt_tokens: Number(o.prompt_tokens ?? 0),
    completion_tokens: Number(o.completion_tokens ?? 0),
    total_tokens: total,
  };
}

/** Extract `usage` from a buffered (non-streaming) JSON response. */
async function extractUsage(res: Response): Promise<TokenUsage | null> {
  try {
    const data = await res.clone().json();
    return toUsage(data?.usage);
  } catch {
    return null;
  }
}

/**
 * Wrap an SSE stream so token usage is captured as it flows through.
 * Expects the provider to send `usage` in a final data chunk
 * (OpenAI does when `stream_options: {include_usage: true}`).
 */
function wrapStreamForUsage(
  body: ReadableStream<Uint8Array>,
  onUsage: (u: TokenUsage) => void
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  let buf = "";
  let reported = false;

  function scan(text: string) {
    for (const line of text.split("\n")) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const payload = t.slice(5).trim();
      if (!payload || payload === "[DONE]" || reported) continue;
      try {
        const u = toUsage(JSON.parse(payload)?.usage);
        if (u) {
          reported = true;
          onUsage(u);
        }
      } catch {
        /* partial chunk — ignore */
      }
    }
  }

  return body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        controller.enqueue(chunk);
        const text = decoder.decode(chunk, { stream: true });
        const lines = (buf + text).split("\n");
        buf = lines.pop() ?? "";
        scan(lines.join("\n"));
      },
      flush(controller) {
        void controller;
        if (buf.trim()) scan(buf);
        buf = "";
      },
    })
  );
}

/**
 * Proxy an OpenAI chat-completions body through the provider/key chain.
 * Returns the upstream Response directly (streaming SSE passes through).
 */
export async function proxyChatCompletion(body: Record<string, unknown>): Promise<Response> {
  const model = String(body.model || "");
  if (!model) return errJson("Missing 'model' in request body.", 400);

  const chain = providersForModel(model);
  if (chain.length === 0) {
    return errJson(
      `No enabled provider configured for model "${model}". Check PROVIDERS_JSON.`,
      404
    );
  }

  // Ask OpenAI-style providers to include usage in the final SSE chunk.
  const wantsStream = body.stream === true;
  const reqBody: Record<string, unknown> = { ...body };
  if (wantsStream && !reqBody.stream_options) {
    reqBody.stream_options = { include_usage: true };
  }
  const payload = JSON.stringify(reqBody);

  const failures: string[] = [];

  for (const p of chain) {
    for (const key of orderedKeys(p.name, p.apiKeys)) {
      const started = Date.now();
      const keyMasked = maskSecret(key);
      const baseLog = {
        time: new Date().toISOString(),
        model,
        provider: p.name,
        key,
        keyMasked,
      };

      let upstream: Response;
      try {
        upstream = await fetch(`${p.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: payload,
        });
      } catch (e) {
        const latencyMs = Date.now() - started;
        const msg = e instanceof Error ? e.message : String(e);
        failures.push(`${p.name}/${keyMasked}: ${msg.slice(0, 100)}`);
        recordRequest({ ...baseLog, success: false, latencyMs, promptTokens: 0, completionTokens: 0, totalTokens: 0, error: "network error" });
        continue; // next key
      }

      const latencyMs = Date.now() - started;

      if (!isRetryable(upstream.status)) {
        // Definitive answer — pass through, capturing usage.
        if (wantsStream && upstream.ok && upstream.body) {
          recordRequest({ ...baseLog, success: true, latencyMs, promptTokens: 0, completionTokens: 0, totalTokens: 0 });
          const wrapped = wrapStreamForUsage(upstream.body, (u) => addTokens(p.name, key, u));
          return new Response(wrapped, {
            status: upstream.status,
            statusText: upstream.statusText,
            headers: upstream.headers,
          });
        }
        const usage = upstream.ok ? await extractUsage(upstream) : null;
        recordRequest({
          ...baseLog,
          success: upstream.ok,
          latencyMs,
          promptTokens: usage?.prompt_tokens ?? 0,
          completionTokens: usage?.completion_tokens ?? 0,
          totalTokens: usage?.total_tokens ?? 0,
          error: upstream.ok ? undefined : `upstream ${upstream.status}`,
        });
        return upstream;
      }

      // Retryable failure — cool this key down, try the next key/provider.
      const text = await upstream.text().catch(() => "");
      const errMsg = `HTTP ${upstream.status}`;
      failures.push(`${p.name}/${keyMasked}: ${errMsg}${text ? ` — ${text.slice(0, 80)}` : ""}`);
      recordRequest({ ...baseLog, success: false, latencyMs, promptTokens: 0, completionTokens: 0, totalTokens: 0, error: errMsg });

      if (upstream.status === 429) cooldownKey(p.name, key, 60_000);
      else if (upstream.status === 401 || upstream.status === 403) cooldownKey(p.name, key, 5 * 60_000);
      else cooldownKey(p.name, key, 30_000);
    }
  }

  return errJson(
    `All providers/keys failed for model "${model}": ${failures.join(" | ")}`,
    502
  );
}

export type { ProviderConfig };
