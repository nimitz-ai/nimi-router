// In-memory request stats. On Vercel serverless this is per-instance
// (resets on cold start) — good enough for a live dashboard overview.
// For persistent analytics, plug in an external store later.

export interface RequestLog {
  time: string;
  model: string;
  provider: string;
  success: boolean;
  latencyMs: number;
  error?: string;
}

interface ProviderCounters {
  requests: number;
  success: number;
  failed: number;
  totalLatencyMs: number;
}

const MAX_LOGS = 100;
const recent: RequestLog[] = [];
const counters = new Map<string, ProviderCounters>();
let totalRequests = 0;

function bump(provider: string, success: boolean, latencyMs: number) {
  let c = counters.get(provider);
  if (!c) {
    c = { requests: 0, success: 0, failed: 0, totalLatencyMs: 0 };
    counters.set(provider, c);
  }
  c.requests += 1;
  c.totalLatencyMs += latencyMs;
  if (success) c.success += 1;
  else c.failed += 1;
  totalRequests += 1;
}

export function recordRequest(log: RequestLog) {
  recent.unshift(log);
  if (recent.length > MAX_LOGS) recent.pop();
  bump(log.provider, log.success, log.latencyMs);
}

export interface StatsSnapshot {
  totalRequests: number;
  successRate: number;
  avgLatencyMs: number;
  providers: { name: string; requests: number; success: number; failed: number; avgLatencyMs: number }[];
  recent: RequestLog[];
}

export function getStats(): StatsSnapshot {
  let ok = 0;
  let lat = 0;
  const providers = [...counters.entries()].map(([name, c]) => {
    ok += c.success;
    lat += c.totalLatencyMs;
    return {
      name,
      requests: c.requests,
      success: c.success,
      failed: c.failed,
      avgLatencyMs: c.requests ? Math.round(c.totalLatencyMs / c.requests) : 0,
    };
  });
  return {
    totalRequests,
    successRate: totalRequests ? Math.round((ok / totalRequests) * 100) : 100,
    avgLatencyMs: totalRequests ? Math.round(lat / totalRequests) : 0,
    providers,
    recent: [...recent],
  };
}
