# VoiceShield

Vite/React dashboard for testing voice agents against EU AI Act requirements.

## Architecture

VoiceShield uses a **backend-for-frontend (BFF) proxy** (`server/proxy.ts`) to keep
provider API keys off the browser:

- **`AIML_API_KEYS`** and **`SPEECHMATICS_API_KEYS`** can come from server-side
  environment variables (see `.env.example`) **or** from the **Settings → Provider
  keys** screen, where anyone can paste their own keys. They are never bundled,
  never stored in localStorage/sessionStorage, and never sent to a third party
  from client code.
- The browser only calls `/api/*` on its own origin. In development, Vite proxies
  `/api` to the BFF (which runs on port 8787). The proxy forwards chat completions
  to AIML, mints short-lived (60s) Speechmatics JWTs for realtime transcription,
  and proxies Speechmatics TTS — so the raw keys never reach the Network tab.
- Mock mode works with no keys at all.

## Key rotation

The BFF supports rotating provider keys through several mechanisms, all keeping
the raw keys server-side:

- **Pools.** `AIML_API_KEYS` / `SPEECHMATICS_API_KEYS` may hold a comma-separated
  list of keys. The legacy single-key vars (`AIML_API_KEY`, `SPEECHMATICS_API_KEY`)
  still work as a one-key pool.
- **Periodic.** The active pool key advances every `KEY_ROTATION_INTERVAL`
  (default `6h`), cycling through the pool.
- **Manual.** A "Rotate now" button in Settings → Provider keys advances to the
  next key immediately (per provider).
- **Health.** After `KEY_ROTATION_FAILURE_THRESHOLD` (default `3`) consecutive
  upstream failures with the active key, the proxy auto-rotates.
- **Security.** Any endpoint (`POST /api/keys/:provider/rotate` with
  `reason: "security"`) forces immediate rotation — use it for key exposure,
  breach suspicion, or session takeover. The proxy also scans provider error
  output and log lines for active key material and redacts + rotates if it ever
  appears.
- **Session keys.** Keys pasted from Settings → Provider keys live only in server
  memory for the session (`RUNTIME_KEY_TTL`, default `6h`), then fall back to the
  pool. They participate in rotation and are cleared on restart.

Rotation status (pool size, active position, next rotation time, failure counters,
and a recent event log) is shown in Settings → Provider keys.

## Run locally

```bash
npm install

# 1. (Optional) Configure persistent server-side keys — never commit .env
cp .env.example .env
#    - set AIML_API_KEYS (comma-separated pool, or legacy AIML_API_KEY)
#    - set SPEECHMATICS_API_KEYS (comma-separated pool, or legacy SPEECHMATICS_API_KEY)
#    - optionally tweak KEY_ROTATION_INTERVAL / KEY_ROTATION_FAILURE_THRESHOLD

# 2. Start both the BFF proxy and the Vite dev server
npm run dev
```

Open the local URL shown by Vite. No developer? No problem: open **Settings →
Provider keys** and paste your AIML / Speechmatics keys right there. Pasted keys
are held in the proxy's memory for the session (up to 6 hours), never written to
disk or the browser, and shown back only as a masked preview — so judges,
customers, and users can connect providers without ever touching `.env` or source
code. If the proxy restarts, session keys clear and you can paste them again.

## Proxy endpoints

| Endpoint                       | Purpose                                              |
| ------------------------------ | ---------------------------------------------------- |
| `GET  /api/health`             | Liveness check                                       |
| `GET  /api/keys/status`        | Status + rotation state + event log — no raw key material |
| `POST /api/keys`               | Store a pasted key in server memory (masked preview returned) |
| `DELETE /api/keys/:provider`   | Remove a session key (falls back to server pool)     |
| `POST /api/keys/:provider/rotate` | Rotate now (body `{"reason":"manual"\|"security"}`) |
| `POST /api/aiml/chat`          | Forwards chat completions to AIML with the key       |
| `POST /api/speechmatics/token` | Mints a 60s Speechmatics JWT (raw key stays server)  |
| `POST /api/speechmatics/tts`   | Proxies TTS and returns the audio blob               |

The proxy includes CORS restricted to same-origin/localhost (plus any origins in
`ALLOWED_ORIGINS`), a basic per-IP rate limit (60 req/min), a 1 MB JSON body limit,
and a `GET /api/health` endpoint.

## Production deployment

Run `server/proxy.ts` on the same origin/domain as the built app (same VPS, same
domain, or a Docker sidecar) and serve the app with any static host. Set the keys
as real environment variables — `.env` is for local development only.

## Checks

```bash
npm run typecheck
npm run build
```
