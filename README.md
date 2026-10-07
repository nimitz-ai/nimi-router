# nimi-router

An AI model router with a dashboard — inspired by [9Router](https://github.com/9router/9router).
OpenAI-compatible API with **smart fallback** across multiple providers, deployable to Vercel with zero database.

## Features

- 🔀 **Smart fallback** — providers tried in priority order; on 429 / 5xx / network error / bad key, the router automatically moves to the next provider
- 🔑 **Multi-key per provider** — each provider can hold many API keys; requests rotate round-robin across keys, and a key that errors is cooled down automatically (429 → 60s, 401/403 → 5min)
- 📊 **Token usage logs** — prompt/completion/total tokens tracked per key, including streaming responses (via `stream_options: {include_usage: true}`)
- 🔌 **OpenAI-compatible API** — `POST /api/v1/chat/completions` (streaming SSE supported) and `GET /api/v1/models` work with any OpenAI client/SDK
- 📈 **Dashboard** — provider status with per-key stats, request log, live playground
- 🔐 **API key auth** for the router API + optional password lock for the dashboard
- ☁️ **Vercel-ready** — config via environment variables, no database needed
- 🌐 **Any OpenAI-compatible provider** — OpenAI, OpenRouter, DeepSeek, GLM, Moonshot, Groq, Together, Ollama, …

## Quick start (local)

```bash
npm install
cp .env.example .env   # then edit it
npm run dev            # http://localhost:3000
```

## Configuration

| Variable | Purpose |
|---|---|
| `PROVIDERS_JSON` | JSON array of providers (required) — see `.env.example` |
| `ROUTER_API_KEY` | Bearer key clients must send. Empty = open access |
| `DASHBOARD_PASSWORD` | Password for the dashboard UI. Empty = no login |

Provider entry:

```json
{
  "name": "OpenRouter",
  "baseUrl": "https://openrouter.ai/api/v1",
  "apiKeys": ["sk-or-aaa", "sk-or-bbb"],
  "models": ["*"],
  "priority": 2,
  "enabled": true
}
```

- `apiKeys`: array of keys — requests rotate round-robin; failing keys cool down automatically. A single `apiKey` string also works.
- `models: ["*"]` accepts any model name (the router discovers the provider's catalogue for `/v1/models`).
- Lower `priority` is tried first.

## Use it from any OpenAI client

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://YOUR-APP.vercel.app/api/v1",
    api_key="YOUR_ROUTER_API_KEY",
)
res = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello!"}],
)
```

```bash
curl https://YOUR-APP.vercel.app/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ROUTER_API_KEY" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"hi"}]}'
```

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import it at [vercel.com/new](https://vercel.com/new).
3. Add the environment variables above.
4. Deploy — done. Your router lives at `https://YOUR-APP.vercel.app`.

> Notes: request stats are in-memory per serverless instance (reset on cold start).
> `maxDuration` is 60s — long streaming generations on the Hobby plan may be cut off;
> upgrade to Pro for longer timeouts.

## API reference

| Method & path | Auth | Description |
|---|---|---|
| `POST /api/v1/chat/completions` | Bearer key | Chat completions with fallback, SSE streaming supported |
| `GET /api/v1/models` | Bearer key | Aggregated model list (OpenAI shape) |
| `GET /api/health` | none | Health check |

## License

MIT
