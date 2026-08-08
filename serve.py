"""
VoiceShield — Python / FastAPI offline server  (TASK-01)

Drop-in replacement for the Node.js Vite dev-server + server/proxy.ts.
Works in any Python 3.11+ environment, including NativelyAI's Native Builder
sandbox, without requiring Vite, Node, or an internet connection at runtime.

Usage
-----
    pip install -r requirements.txt
    python serve.py                  # listens on PORT (default 8080)
    PROXY_PORT=9000 python serve.py  # custom port

Environment variables (same names as the Node proxy)
-----------------------------------------------------
    AIML_API_KEY / AIML_API_KEYS
    SPEECHMATICS_API_KEY / SPEECHMATICS_API_KEYS
    AIML_API_URL           (default: https://api.aimlapi.com/v1/chat/completions)
    SPEECHMATICS_TTS_URL   (default: https://preview.tts.speechmatics.com)
    KEY_ROTATION_INTERVAL  (e.g. "6h", default: 6h)
    KEY_ROTATION_FAILURE_THRESHOLD (integer, default: 3)
    RUNTIME_KEY_TTL        (e.g. "6h", default: 6h)
    ALLOWED_ORIGINS        (comma-separated extra CORS origins)
    PORT / PROXY_PORT      (default: 8080)
"""
from __future__ import annotations

import os
import re
import time
from collections import deque
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Request, Response
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

# ---------------------------------------------------------------------------
# Bootstrap
# ---------------------------------------------------------------------------

load_dotenv()

_DIST = Path(__file__).parent / "dist"
_INDEX = _DIST / "index.html"

AIML_URL: str = os.getenv("AIML_API_URL", "https://api.aimlapi.com/v1/chat/completions")
SM_MP_URL: str = "https://mp.speechmatics.com/v1/api_keys?type=rt"
TTS_URL: str = os.getenv("SPEECHMATICS_TTS_URL", "https://preview.tts.speechmatics.com").rstrip("/")
TTS_VOICES: frozenset[str] = frozenset({"sarah", "theo", "megan", "jack"})

EXTRA_ORIGINS: list[str] = [
    o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()
]
MAX_BODY_BYTES: int = 1024 * 1024
MAX_KEY_LENGTH: int = 512
MAX_EVENTS: int = 10

# ---------------------------------------------------------------------------
# Duration / threshold helpers
# ---------------------------------------------------------------------------

_DUR_RE = re.compile(r"^(\d+)\s*(ms|s|m|h|d)?$", re.IGNORECASE)
_DUR_UNITS: dict[str, int] = {"ms": 1, "s": 1_000, "m": 60_000, "h": 3_600_000, "d": 86_400_000}


def parse_duration(value: str | None, fallback_ms: int) -> int:
    if not value:
        return fallback_ms
    m = _DUR_RE.match(value.strip())
    if not m:
        return fallback_ms
    unit = (m.group(2) or "ms").lower()
    return int(m.group(1)) * _DUR_UNITS[unit]


def parse_threshold(value: str | None, fallback: int) -> int:
    if not value:
        return fallback
    try:
        n = int(value)
        return n if n >= 1 else fallback
    except ValueError:
        return fallback


def format_duration(ms: int) -> str:
    for suffix, size in (("d", 86_400_000), ("h", 3_600_000), ("m", 60_000), ("s", 1_000)):
        if ms >= size and ms % size == 0:
            return f"{ms // size}{suffix}"
    return f"{ms}ms"


RUNTIME_KEY_TTL_MS: int = parse_duration(os.getenv("RUNTIME_KEY_TTL"), 6 * 3_600_000)
ROTATION_INTERVAL_MS: int = parse_duration(os.getenv("KEY_ROTATION_INTERVAL"), 6 * 3_600_000)
FAILURE_THRESHOLD: int = parse_threshold(os.getenv("KEY_ROTATION_FAILURE_THRESHOLD"), 3)

# ---------------------------------------------------------------------------
# Per-provider key state
# ---------------------------------------------------------------------------

_PROVIDERS: tuple[str, ...] = ("aiml", "speechmatics")

_RotationReason = str  # "periodic" | "manual" | "health" | "security" | "set" | "clear" | "expired"
_KeySource = str       # "env" | "runtime" | "none"


class ProviderState:
    __slots__ = (
        "pool", "active_index", "runtime_key", "runtime_key_set_at",
        "failure_count", "last_rotated_at", "next_rotation_at", "events",
    )

    def __init__(self, pool: list[str]) -> None:
        self.pool: list[str] = pool
        self.active_index: int = 0
        self.runtime_key: str | None = None
        self.runtime_key_set_at: float | None = None
        self.failure_count: int = 0
        self.last_rotated_at: float | None = None
        self.next_rotation_at: float | None = (
            time.time() * 1000 + ROTATION_INTERVAL_MS if len(pool) >= 2 else None
        )
        self.events: deque[dict[str, Any]] = deque(maxlen=MAX_EVENTS)


def _parse_pool(plural: str | None, singular: str | None) -> list[str]:
    keys = [k.strip() for k in (plural or "").split(",") if k.strip()]
    if keys:
        return keys
    single = (singular or "").strip()
    return [single] if single else []


_states: dict[str, ProviderState] = {
    "aiml": ProviderState(_parse_pool(os.getenv("AIML_API_KEYS"), os.getenv("AIML_API_KEY"))),
    "speechmatics": ProviderState(_parse_pool(os.getenv("SPEECHMATICS_API_KEYS"), os.getenv("SPEECHMATICS_API_KEY"))),
}


def _active_source(state: ProviderState) -> _KeySource:
    if state.runtime_key and state.runtime_key_set_at is not None:
        if (time.time() * 1000 - state.runtime_key_set_at) < RUNTIME_KEY_TTL_MS:
            return "runtime"
    return "env" if state.pool else "none"


def _current_key(state: ProviderState) -> str:
    if _active_source(state) == "runtime" and state.runtime_key:
        return state.runtime_key
    return state.pool[state.active_index] if state.pool else ""


def _push_event(state: ProviderState, reason: _RotationReason, detail: str, source: _KeySource) -> None:
    state.events.appendleft({"at": int(time.time() * 1000), "reason": reason, "detail": detail, "source": source})


def _rotate(provider: str, reason: _RotationReason, detail: str) -> None:
    state = _states[provider]
    if _active_source(state) == "runtime":
        state.runtime_key = None
        state.runtime_key_set_at = None
    if len(state.pool) >= 2:
        state.active_index = (state.active_index + 1) % len(state.pool)
    state.failure_count = 0
    state.last_rotated_at = time.time() * 1000
    state.next_rotation_at = (
        time.time() * 1000 + ROTATION_INTERVAL_MS if len(state.pool) >= 2 else None
    )
    _push_event(state, reason, detail, _active_source(state))


def _maybe_rotate_periodically(state: ProviderState) -> None:
    if len(state.pool) < 2:
        return
    now = time.time() * 1000
    if state.next_rotation_at is None:
        state.next_rotation_at = now + ROTATION_INTERVAL_MS
        return
    if now < state.next_rotation_at:
        return
    state.active_index = (state.active_index + 1) % len(state.pool)
    state.last_rotated_at = now
    state.next_rotation_at = now + ROTATION_INTERVAL_MS
    _push_event(state, "periodic", "Scheduled rotation — advanced to the next key in the pool", _active_source(state))


def _resolve_key(provider: str) -> str:
    state = _states[provider]
    if state.runtime_key and state.runtime_key_set_at is not None:
        if (time.time() * 1000 - state.runtime_key_set_at) >= RUNTIME_KEY_TTL_MS:
            state.runtime_key = None
            state.runtime_key_set_at = None
            state.last_rotated_at = time.time() * 1000
            _push_event(state, "expired", "Session key expired after its TTL — fell back to the server pool", _active_source(state))
    _maybe_rotate_periodically(state)
    return _current_key(state)


def _record_failure(provider: str) -> None:
    state = _states[provider]
    state.failure_count += 1
    can_rotate = len(state.pool) >= 2 or _active_source(state) == "runtime"
    if not can_rotate:
        state.failure_count = min(state.failure_count, FAILURE_THRESHOLD)
        return
    if state.failure_count >= FAILURE_THRESHOLD:
        _rotate(provider, "health", f"Rotated after {FAILURE_THRESHOLD} consecutive provider failures")


def _record_success(provider: str) -> None:
    _states[provider].failure_count = 0


def _mask_key(key: str) -> str:
    if not key:
        return ""
    if len(key) <= 8:
        return f"{key[:2]}••••"
    return f"{key[:4]}••••{key[-4:]}"


def _redact_exposed_keys(provider: str, message: str) -> str:
    state = _states[provider]
    keys: set[str] = set()
    if state.runtime_key:
        keys.add(state.runtime_key)
    for k in state.pool:
        if k:
            keys.add(k)
    output = message
    exposed = False
    for k in keys:
        if len(k) >= 8 and k in output:
            output = output.replace(k, "••••••••")
            exposed = True
    if exposed:
        _rotate(provider, "security", "Active key material appeared in provider output — rotated immediately")
    return output


def _redact_any_keys(message: str) -> str:
    for p in _PROVIDERS:
        message = _redact_exposed_keys(p, message)
    return message


def _key_status(provider: str) -> dict[str, Any]:
    state = _states[provider]
    source = _active_source(state)
    key = _current_key(state)
    rotation_enabled = len(state.pool) >= 2
    return {
        "configured": bool(key),
        "source": source,
        "masked": _mask_key(key) if key else None,
        "rotation": {
            "enabled": rotation_enabled,
            "poolSize": len(state.pool),
            "activeIndex": state.active_index,
            "intervalMs": ROTATION_INTERVAL_MS,
            "nextRotationAt": state.next_rotation_at if rotation_enabled else None,
            "lastRotatedAt": state.last_rotated_at,
            "lastReason": state.events[0]["reason"] if state.events else None,
            "lastReasonAt": state.events[0]["at"] if state.events else None,
            "failureCount": state.failure_count,
            "failureThreshold": FAILURE_THRESHOLD,
        },
        "events": list(state.events)[:8],
    }


# ---------------------------------------------------------------------------
# Rate limiting (per-IP, sliding window)
# ---------------------------------------------------------------------------

_RL_WINDOW_MS: int = 60_000
_RL_MAX: int = 60
_rl_hits: dict[str, list[float]] = {}


def _rate_limited(ip: str) -> bool:
    now = time.time() * 1000
    cutoff = now - _RL_WINDOW_MS
    if len(_rl_hits) > 10_000:
        _rl_hits.clear()
    recent = [t for t in _rl_hits.get(ip, []) if t >= cutoff]
    if len(recent) >= _RL_MAX:
        _rl_hits[ip] = recent
        return True
    recent.append(now)
    _rl_hits[ip] = recent
    return False


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ---------------------------------------------------------------------------
# CORS helpers
# ---------------------------------------------------------------------------

def _origin_allowed(request: Request) -> bool:
    origin = request.headers.get("origin")
    if not origin:
        return True
    try:
        from urllib.parse import urlparse
        parsed = urlparse(origin)
        origin_host = f"{parsed.hostname}:{parsed.port}" if parsed.port else parsed.hostname or ""
        host_header = request.headers.get("host", "")
        if origin_host == host_header or origin_host == host_header.split(":")[0]:
            return True
        if origin in EXTRA_ORIGINS:
            return True
        if re.match(r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$", origin):
            return True
    except Exception:
        return False
    return False


def _cors_headers(request: Request) -> dict[str, str]:
    origin = request.headers.get("origin")
    if origin:
        return {"Access-Control-Allow-Origin": origin, "Vary": "Origin"}
    return {}


# ---------------------------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------------------------

_http: httpx.AsyncClient | None = None


@asynccontextmanager
async def _lifespan(application: FastAPI):  # noqa: ARG001
    global _http
    _http = httpx.AsyncClient(timeout=30.0, follow_redirects=True)
    print("[serve] VoiceShield offline server starting")
    print(f"[serve] Static files: {'dist/ found' if _DIST.exists() else 'dist/ MISSING — run npm run build first'}")
    print(f"[serve] AIML pool: {len(_states['aiml'].pool)} key(s)  |  Speechmatics pool: {len(_states['speechmatics'].pool)} key(s)")
    print(f"[serve] Rotation interval: {format_duration(ROTATION_INTERVAL_MS)}  |  failure threshold: {FAILURE_THRESHOLD}")
    yield
    if _http:
        await _http.aclose()


app = FastAPI(title="VoiceShield Offline Server", docs_url=None, redoc_url=None, lifespan=_lifespan)


# ---------------------------------------------------------------------------
# /api/* routes — must be registered BEFORE the static mount
# ---------------------------------------------------------------------------

def _json(status: int, payload: Any, extra_headers: dict[str, str] | None = None) -> JSONResponse:
    headers = {"Cache-Control": "no-store", **(extra_headers or {})}
    return JSONResponse(content=payload, status_code=status, headers=headers)


@app.get("/api/health")
async def health(request: Request) -> JSONResponse:
    if not _origin_allowed(request):
        return _json(403, {"error": "Cross-origin requests are not allowed."})
    return _json(200, {"ok": True}, _cors_headers(request))


@app.get("/api/keys/status")
async def keys_status(request: Request) -> JSONResponse:
    if not _origin_allowed(request):
        return _json(403, {"error": "Cross-origin requests are not allowed."})
    if _rate_limited(_client_ip(request)):
        return _json(429, {"error": "Too many requests. Please try again in a moment."}, _cors_headers(request))
    aiml = _key_status("aiml")
    sm = _key_status("speechmatics")
    return _json(200, {
        "aiml": aiml["configured"],
        "speechmatics": sm["configured"],
        "sources": {"aiml": aiml["source"], "speechmatics": sm["source"]},
        "masked": {"aiml": aiml["masked"], "speechmatics": sm["masked"]},
        "rotation": {"aiml": aiml["rotation"], "speechmatics": sm["rotation"]},
        "events": {"aiml": aiml["events"], "speechmatics": sm["events"]},
    }, _cors_headers(request))


@app.post("/api/keys")
async def set_key(request: Request) -> JSONResponse:
    if not _origin_allowed(request):
        return _json(403, {"error": "Cross-origin requests are not allowed."})
    if _rate_limited(_client_ip(request)):
        return _json(429, {"error": "Too many requests."}, _cors_headers(request))
    body = await _read_json(request)
    if not isinstance(body, dict):
        return _json(400, {"error": "Invalid JSON body."}, _cors_headers(request))
    provider = body.get("provider")
    api_key = str(body.get("apiKey", "")).strip()
    if provider not in _PROVIDERS:
        return _json(400, {"error": "Unknown provider. Use 'aiml' or 'speechmatics'."}, _cors_headers(request))
    if not api_key:
        return _json(400, {"error": "The API key must not be empty."}, _cors_headers(request))
    if len(api_key) > MAX_KEY_LENGTH:
        return _json(400, {"error": "The API key is too long (max 512 characters)."}, _cors_headers(request))
    state = _states[provider]
    state.runtime_key = api_key
    state.runtime_key_set_at = time.time() * 1000
    state.failure_count = 0
    state.last_rotated_at = time.time() * 1000
    _push_event(state, "set", "New session key pasted in Settings → Provider keys", "runtime")
    return _json(200, _key_result_payload(provider), _cors_headers(request))


@app.delete("/api/keys/{provider}")
async def clear_key(provider: str, request: Request) -> JSONResponse:
    if not _origin_allowed(request):
        return _json(403, {"error": "Cross-origin requests are not allowed."})
    if provider not in _PROVIDERS:
        return _json(400, {"error": "Unknown provider. Use 'aiml' or 'speechmatics'."})
    state = _states[provider]
    if state.runtime_key:
        state.runtime_key = None
        state.runtime_key_set_at = None
        state.last_rotated_at = time.time() * 1000
        _push_event(state, "clear", "Session key removed from Settings — fell back to the server pool", _active_source(state))
    return _json(200, _key_result_payload(provider), _cors_headers(request))


@app.post("/api/keys/{provider}/rotate")
async def rotate_key(provider: str, request: Request) -> JSONResponse:
    if not _origin_allowed(request):
        return _json(403, {"error": "Cross-origin requests are not allowed."})
    if provider not in _PROVIDERS:
        return _json(400, {"error": "Unknown provider. Use 'aiml' or 'speechmatics'."})
    body = await _read_json(request)
    reason: _RotationReason = "security" if isinstance(body, dict) and body.get("reason") == "security" else "manual"
    if reason == "security":
        _rotate(provider, "security", "Forced rotation after a security event")
    else:
        _rotate(provider, "manual", "Rotated manually from Settings → Provider keys")
    return _json(200, _key_result_payload(provider), _cors_headers(request))


@app.post("/api/aiml/chat")
async def aiml_chat(request: Request) -> Response:
    if not _origin_allowed(request):
        return _json(403, {"error": "Cross-origin requests are not allowed."})
    if _rate_limited(_client_ip(request)):
        return _json(429, {"error": "Too many requests."}, _cors_headers(request))
    key = _resolve_key("aiml")
    if not key:
        return _json(503, {
            "error": "AIML is not configured. Paste an AIML API key in Settings → Provider keys, "
                     "or set AIML_API_KEYS / AIML_API_KEY.",
        }, _cors_headers(request))
    try:
        body = await _read_json(request)
    except ValueError as exc:
        status = 413 if "too large" in str(exc).lower() else 400
        return _json(status, {"error": str(exc)}, _cors_headers(request))
    if not isinstance(body, dict) or not isinstance(body.get("model"), str) or not isinstance(body.get("messages"), list):
        return _json(400, {"error": "Request must include a 'model' string and a 'messages' array."}, _cors_headers(request))
    try:
        assert _http is not None
        upstream = await _http.post(
            AIML_URL,
            json={k: body[k] for k in ("model", "messages", "temperature", "max_tokens") if k in body},
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        )
    except Exception as exc:
        _record_failure("aiml")
        return _json(502, {"error": f"AIML request failed: {_redact_any_keys(str(exc))}"}, _cors_headers(request))
    text = upstream.text
    if not upstream.is_success:
        _record_failure("aiml")
        return Response(
            content=_redact_exposed_keys("aiml", text),
            status_code=upstream.status_code,
            media_type=upstream.headers.get("content-type", "application/json"),
            headers={"Cache-Control": "no-store", **_cors_headers(request)},
        )
    _record_success("aiml")
    return Response(
        content=text,
        status_code=upstream.status_code,
        media_type=upstream.headers.get("content-type", "application/json"),
        headers={"Cache-Control": "no-store", **_cors_headers(request)},
    )


@app.post("/api/speechmatics/token")
async def speechmatics_token(request: Request) -> JSONResponse:
    if not _origin_allowed(request):
        return _json(403, {"error": "Cross-origin requests are not allowed."})
    if _rate_limited(_client_ip(request)):
        return _json(429, {"error": "Too many requests."}, _cors_headers(request))
    key = _resolve_key("speechmatics")
    if not key:
        return _json(503, {
            "error": "Speechmatics is not configured. Paste a Speechmatics API key in Settings → Provider keys, "
                     "or set SPEECHMATICS_API_KEYS / SPEECHMATICS_API_KEY.",
        }, _cors_headers(request))
    try:
        assert _http is not None
        upstream = await _http.post(
            SM_MP_URL,
            json={"ttl": 60},
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        )
    except Exception as exc:
        _record_failure("speechmatics")
        return _json(502, {"error": f"Speechmatics token request failed: {str(exc)}"}, _cors_headers(request))
    data = upstream.json()
    if not upstream.is_success or "key_value" not in data:
        _record_failure("speechmatics")
        safe_msg = _redact_exposed_keys("speechmatics", data.get("message", "Speechmatics token request failed."))
        return _json(upstream.status_code if not upstream.is_success else 502, {"error": safe_msg}, _cors_headers(request))
    _record_success("speechmatics")
    return _json(200, {"key_value": data["key_value"]}, _cors_headers(request))


@app.post("/api/speechmatics/tts")
async def speechmatics_tts(request: Request) -> Response:
    if not _origin_allowed(request):
        return _json(403, {"error": "Cross-origin requests are not allowed."})
    if _rate_limited(_client_ip(request)):
        return _json(429, {"error": "Too many requests."}, _cors_headers(request))
    key = _resolve_key("speechmatics")
    if not key:
        return _json(503, {
            "error": "Speechmatics is not configured. Paste a Speechmatics API key in Settings → Provider keys.",
        }, _cors_headers(request))
    voice = request.query_params.get("voice", "theo")
    if voice not in TTS_VOICES:
        return _json(400, {"error": f"Unsupported TTS voice: {voice}"}, _cors_headers(request))
    body = await _read_json(request)
    text_val = str(body.get("text", "")).strip() if isinstance(body, dict) else ""
    if not text_val:
        return _json(400, {"error": "Missing 'text' in the request body."}, _cors_headers(request))
    try:
        assert _http is not None
        upstream = await _http.post(
            f"{TTS_URL}/generate/{voice}?output_format=wav_16000",
            json={"text": text_val},
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        )
    except Exception as exc:
        _record_failure("speechmatics")
        return _json(502, {"error": f"Speechmatics TTS request failed: {str(exc)}"}, _cors_headers(request))
    if not upstream.is_success:
        _record_failure("speechmatics")
    else:
        _record_success("speechmatics")
    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        media_type=upstream.headers.get("content-type", "audio/wav"),
        headers={"Cache-Control": "no-store", **_cors_headers(request)},
    )


@app.options("/api/{path:path}")
async def api_options(path: str, request: Request) -> Response:
    return Response(
        status_code=204,
        headers={
            "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            **_cors_headers(request),
        },
    )


# ---------------------------------------------------------------------------
# Helper: body reader
# ---------------------------------------------------------------------------

async def _read_json(request: Request) -> Any:
    body = await request.body()
    if len(body) > MAX_BODY_BYTES:
        raise ValueError("Payload too large")
    if not body:
        return {}
    import json
    return json.loads(body)


def _key_result_payload(provider: str) -> dict[str, Any]:
    status = _key_status(provider)
    return {
        "ok": True,
        "provider": provider,
        "source": status["source"],
        "masked": status["masked"],
        "rotation": status["rotation"],
        "events": status["events"],
    }


# ---------------------------------------------------------------------------
# Static file serving — SPA catch-all (must come AFTER /api routes)
# ---------------------------------------------------------------------------

if _DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(_DIST / "assets")), name="assets")

    @app.get("/favicon.svg")
    async def favicon() -> FileResponse:
        f = _DIST / "favicon.svg"
        return FileResponse(str(f)) if f.exists() else Response(status_code=404)

    @app.get("/natively-runtime.js")
    async def natively_runtime() -> FileResponse:
        f = _DIST / "natively-runtime.js"
        return FileResponse(str(f)) if f.exists() else Response(content="", media_type="application/javascript")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str) -> FileResponse:
        # HashRouter: all paths serve index.html; routing is client-side.
        return FileResponse(str(_INDEX))
else:
    @app.get("/{full_path:path}")
    async def no_dist(full_path: str) -> JSONResponse:
        return JSONResponse(
            {"error": "Frontend not built. Run: npm run build"},
            status_code=503,
        )


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PROXY_PORT") or os.getenv("PORT") or 8080)
    print(f"[serve] Listening on http://localhost:{port}")
    uvicorn.run("serve:app", host="0.0.0.0", port=port, reload=False)
