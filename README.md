---
title: "VoiceShield — Voice Compliance QA Frontend"
version: "2026.08.01.00"
keywords: ["voiceshield", "voicegate", "voice-compliance", "eu-ai-act", "red-team", "react", "typescript", "fastapi"]
---

<div align="center">

<img src="promotions/X_VOICE_X.png" alt="X Voice X — VoiceShield banner" width="640"/>

# VoiceShield

**Automated red-team & compliance test bench for voice AI agents.**

[![Build](https://img.shields.io/badge/build-passing-brightgreen?style=flat-square)](#)
[![Python](https://img.shields.io/badge/python-3.11%2B-blue?style=flat-square)](#)
[![Node](https://img.shields.io/badge/node-20%2B-green?style=flat-square)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=flat-square)](#)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square)](#)

</div>

---

## Table of Contents

- [Abstract](#abstract)
- [Key Words](#key-words)
- [Executive Summary](#executive-summary)
- [Key Findings](#key-findings)
- [Philosophical Preamble](#philosophical-preamble)
- [Features](#features)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Docker](#docker)
- [Key Rotation](#key-rotation)
- [Development](#development)
- [Testing](#testing)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)
- [Changelog](#changelog)

---

## Abstract

VoiceShield is the frontend component of the VoiceGate Voice Compliance QA (VCQ)
platform. It provides a React + TypeScript single-page application that enables
teams to simulate adversarial callers, run conversation gauntlets against live voice
AI agents, and score each call against statutory requirements (EU AI Act Article 50,
California SB 243) and the target company's own published terms of service. The
result is a Pass/Fail/Flag verdict with explicit rule citations.

---

## Key Words

voice-compliance, voicegate, eu-ai-act, california-sb-243, red-teaming, voice-ai,
react, typescript, fastapi, offline-server, bff-proxy, key-rotation, speechmatics,
aiml, hackathon, lablab-ai-factory.

---

## Executive Summary

VoiceShield exposes three main views:

1.1. **Test Bench** — choose a persona and agent role, drive a live conversation, then
trigger an AI evaluation against the active statutory/policy corpus.

1.2. **Test Runs** — browse the full history of saved runs with verdict badges (Pass /
Flag / Fail) and inline transcript + findings.

1.3. **Risk Report** — aggregate compliance posture: pass/flag/fail rates, trend
charts, and per-rule violation breakdowns.

A backend-for-frontend (BFF) proxy keeps all provider keys server-side. The browser
never sees a raw API key; it only talks to `/api/*` on its own origin.

---

## Key Findings

2.1. No raw API key ever reaches the browser — all provider calls are routed through
the BFF proxy (`server/proxy.ts` / `serve.py`).

2.2. The app works fully offline once the pre-built `dist/` bundle is served by the
Python FastAPI server (`python serve.py`) — no Vite or Node required at runtime.

2.3. Both a "Rose" (light pink) and "Noir" (dark) theme variant are supported, toggled
per-user and persisted in `localStorage`.

2.4. Provider key pools support periodic rotation (default 6 h), health-triggered
rotation (after N consecutive failures), and security rotation (if key material
appears in a provider error response).

---

## Philosophical Preamble

Voice AI agents are becoming front-line representatives for organisations in
sectors where a misstatement can cost $1,000 per violation (CA SB 243) or expose
the deployer to a private right of action. The Air Canada tribunal precedent —
where a chatbot invented a refund policy and the airline was held to honour it —
illustrates that "it was the AI" is not a defence. VoiceShield exists to make the
gap between *what an agent says* and *what it is allowed to say* measurable,
repeatable, and fixable before a real call is made.

---

## Features

| Capability | Detail |
|---|---|
| Persona simulation | Minor client, crisis caller, adversarial refund requester |
| Statutory scoring | EU AI Act Art. 50, CA SB 243; verdict: Pass / Flag / Fail |
| Live transcription | Speechmatics real-time API via server-minted 60 s JWT |
| AI evaluation | AIML chat completions judge, prompt-injection resistant |
| Key rotation | Pool-based periodic + health + security rotation |
| Offline server | `python serve.py` — works without Vite/Node |
| Docker | Single-container deployment (Node BFF + static files) |
| Dual theme | Rose (#FFAEC9 / #000) and Noir (#000 / #FFAEC9) |

---

## Quick Start

### Option 1 — Python offline server (recommended for NativelyAI / offline use)

```bash
# 1. Clone / enter the repository
git clone <repo-url> && cd voiceshield

# 2. Build the frontend (requires internet once)
npm install && npm run build

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. Copy and fill in your API keys
cp .env.example .env

# 5. Start the server
python serve.py          # http://localhost:8080
```

### Option 2 — Node dev server (hot-reload, requires internet)

```bash
npm install
cp .env.example .env
npm run dev              # http://localhost:5173
```

---

## Architecture

```
Browser  ──/api/*──►  BFF Proxy (Node: server/proxy.ts  │  Python: serve.py)
                              │
                    ┌─────────┴──────────┐
                    ▼                    ▼
              AIML API            Speechmatics API
          (chat completions)   (JWT token + TTS)
```

The BFF proxy is the **only** place provider API keys live. It exposes:

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/health` | GET | Liveness check |
| `/api/keys/status` | GET | Key pool status (no raw keys returned) |
| `/api/keys` | POST | Paste a session key from Settings |
| `/api/keys/{provider}` | DELETE | Clear a session key |
| `/api/keys/{provider}/rotate` | POST | Manual or security-forced rotation |
| `/api/aiml/chat` | POST | Chat completions proxy |
| `/api/speechmatics/token` | POST | Mint a 60 s Speechmatics JWT |
| `/api/speechmatics/tts` | POST | TTS proxy |

---

## Docker

### Build

```bash
docker build -t voiceshield:latest .
```

### Run

```bash
docker run -p 8080:8080 \
  -e AIML_API_KEY=sk-... \
  -e SPEECHMATICS_API_KEY=... \
  voiceshield:latest
```

### Kubernetes

See [`k8s/`](k8s/) for manifests. The image exposes port `8080`.

```yaml
# k8s/deployment.yaml (excerpt)
containers:
  - name: voiceshield
    image: voiceshield:latest
    ports:
      - containerPort: 8080
    env:
      - name: AIML_API_KEY
        valueFrom:
          secretKeyRef:
            name: voiceshield-secrets
            key: aiml-api-key
```

---

## Key Rotation

The BFF supports layered key rotation:

| Mechanism | Trigger | Behaviour |
|---|---|---|
| Periodic | Every `KEY_ROTATION_INTERVAL` (default: `6h`) | Advance to next key in pool |
| Health | `KEY_ROTATION_FAILURE_THRESHOLD` consecutive failures (default: `3`) | Advance pool key; reset failure counter |
| Security | Key material detected in provider error output | Redact + rotate immediately |
| Manual | `POST /api/keys/{provider}/rotate` | Advance immediately |
| Session key TTL | `RUNTIME_KEY_TTL` (default: `6h`) | Session key expires; fall back to pool |

---

## Development

```bash
npm run dev          # Vite dev server + Node BFF proxy
npm run build        # Production bundle → dist/
npm run typecheck    # TypeScript type check
python serve.py      # Python offline server (after npm run build)
```

### Environment variables

Copy `.env.example` to `.env` and fill in:

```
AIML_API_KEY=sk-...
SPEECHMATICS_API_KEY=...
# Optional — pool rotation
AIML_API_KEYS=sk-key1,sk-key2
KEY_ROTATION_INTERVAL=6h
KEY_ROTATION_FAILURE_THRESHOLD=3
```

---

## Testing

```bash
pip install pytest pytest-asyncio
pytest tests/ -v
# 63 tests: unit, integration, correctness, performance, security
```

---

## Security

See [SECURITY.md](SECURITY.md) for vulnerability reporting and the security model.

Key guarantees:
- Raw API keys are **never** returned by any endpoint.
- Key material in provider error responses is **automatically redacted** and triggers immediate rotation.
- Rate limiting: 60 requests / IP / 60 s on all `/api/*` endpoints.
- CORS: same-origin + localhost only (configurable via `ALLOWED_ORIGINS`).

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

[MIT](LICENSE) — © 2026 VoiceGate / X Voice X project contributors.

---

## Changelog

| Version | Date | Description |
|---|---|---|
| 2026.08.01.00 | 2026-08-07 | TASK-01–03 complete: Python offline server, UI/UX polish, iconography exports |
| 2026.00.00.00 | 2026-07-30 | Initial scaffold — Vite + React + BFF proxy |

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
