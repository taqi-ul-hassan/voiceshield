---
title: "Security Policy — VoiceShield"
version: "2026.08.01.00"
keywords: ["security", "vulnerability-reporting", "api-keys", "responsible-disclosure"]
---

# Security Policy

## Table of Contents

- [Supported Versions](#supported-versions)
- [Security Model](#security-model)
- [Reporting a Vulnerability](#reporting-a-vulnerability)
- [Security Guarantees](#security-guarantees)
- [Known Limitations](#known-limitations)
- [Changelog](#changelog)

---

## Supported Versions

| Version | Supported |
|---|---|
| `main` branch (current) | ✅ Yes |
| Older tags | ❌ No |

---

## Security Model

1.1. **API keys never reach the browser.** All provider API keys (`AIML_API_KEY`,
`SPEECHMATICS_API_KEY`) are held server-side in environment variables or session
memory. The BFF proxy (`server/proxy.ts` / `serve.py`) is the only process that
reads or forwards them.

1.2. **Key material is redacted from all outputs.** If a provider error response
contains an active key string, it is scrubbed from the response and the key is
immediately rotated (`_redact_any_keys`).

1.3. **Rate limiting.** All `/api/*` endpoints enforce 60 requests per IP per
60-second sliding window. Requests over the limit receive `HTTP 429`.

1.4. **CORS enforcement.** Cross-origin requests are limited to the same origin,
`localhost`, and an explicit allow-list (`ALLOWED_ORIGINS`).

1.5. **No persistent storage of secrets.** Session keys stored via the Settings
panel are held in server process memory only, with a configurable TTL (default 6 h).
They are never written to disk, logs, or responses.

---

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

To report a vulnerability:

2.1. Email the maintainers privately at the address in the repository profile,
with subject: `[VoiceShield] Security: <brief title>`.

2.2. Include: a description of the issue, reproduction steps, potential impact, and
your suggested fix (if any).

2.3. You will receive an acknowledgement within 48 hours and a resolution timeline
within 5 business days.

2.4. We follow responsible disclosure: we will credit reporters in the changelog
unless anonymity is requested.

---

## Security Guarantees

| Property | Guarantee |
|---|---|
| Raw API key in browser | Never — enforced by BFF architecture |
| Raw API key in logs | Never — `_redact_any_keys` runs on all error strings |
| Raw API key in API response | Never — `/api/keys/status` returns masked values only |
| Provider key on client disk | Never — keys are memory-only server-side |
| CORS bypass | Not possible — enforced at the BFF layer |

---

## Known Limitations

3.1. Rate limiting is in-memory and per-process; it resets on server restart. For
production, use a shared cache (e.g. Redis) backed rate limiter.

3.2. `X-Forwarded-For` header spoofing can bypass IP-based rate limiting if the
server is behind a trusted reverse proxy that does not sanitise this header.

3.3. The session key TTL is configurable — setting it to `0` disables expiry, which
is not recommended in shared environments.

---

## Changelog

| Version | Date | Author | Description |
|---|---|---|---|
| 2026.08.01.00 | 2026-08-07 | VoiceGate Agent | Initial creation — TASK-04. |
