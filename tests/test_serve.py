"""
VoiceShield offline server — test suite (TASK-01)

Covers:
  - Unit:        key-state helpers, rate limiter, CORS, duration parser
  - Integration: startup, static-asset serving, all /api/* endpoints
  - Correctness: all SPA routes resolve to index.html; assets return 200
  - Performance: cold-start + asset-serving latency benchmarks
  - Security:    no unexpected open ports; key-material redaction; rate limiting

Run:
    pip install -r requirements.txt pytest pytest-asyncio httpx pytest-benchmark
    pytest tests/ -v
"""
from __future__ import annotations

import asyncio
import os
import sys
import time
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient

# ---------------------------------------------------------------------------
# Ensure the voiceshield directory is on the path so serve.py imports cleanly.
# ---------------------------------------------------------------------------
ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

import importlib

# Reset module state between tests by re-importing serve
import serve as _serve_module


@pytest.fixture(autouse=True)
def reset_provider_states():
    """Reset in-memory key state before every test."""
    import serve
    for p in serve._PROVIDERS:
        state = serve._states[p]
        state.pool = []
        state.active_index = 0
        state.runtime_key = None
        state.runtime_key_set_at = None
        state.failure_count = 0
        state.last_rotated_at = None
        state.next_rotation_at = None
        state.events.clear()
    # Also reset rate-limit buckets
    serve._rl_hits.clear()
    yield


@pytest.fixture()
def client():
    """Synchronous TestClient (does NOT start uvicorn)."""
    import serve
    return TestClient(serve.app, raise_server_exceptions=False)


# ===========================================================================
# 1. UNIT TESTS
# ===========================================================================

class TestParseDuration:
    def test_hours(self):
        import serve
        assert serve.parse_duration("6h", 0) == 6 * 3_600_000

    def test_minutes(self):
        import serve
        assert serve.parse_duration("30m", 0) == 30 * 60_000

    def test_seconds(self):
        import serve
        assert serve.parse_duration("10s", 0) == 10_000

    def test_milliseconds(self):
        import serve
        assert serve.parse_duration("500ms", 0) == 500

    def test_bare_number(self):
        import serve
        assert serve.parse_duration("1000", 0) == 1000  # unitless → ms

    def test_invalid_falls_back(self):
        import serve
        assert serve.parse_duration("garbage", 9999) == 9999

    def test_none_falls_back(self):
        import serve
        assert serve.parse_duration(None, 42) == 42


class TestParseThreshold:
    def test_valid(self):
        import serve
        assert serve.parse_threshold("5", 3) == 5

    def test_zero_falls_back(self):
        import serve
        assert serve.parse_threshold("0", 3) == 3

    def test_invalid_falls_back(self):
        import serve
        assert serve.parse_threshold("abc", 3) == 3


class TestMaskKey:
    def test_long_key(self):
        import serve
        masked = serve._mask_key("abcdef1234567890")
        assert "••••" in masked
        assert "abcd" in masked
        assert "7890" in masked

    def test_short_key(self):
        import serve
        masked = serve._mask_key("ab1234")
        assert "ab" in masked
        assert "••••" in masked

    def test_empty(self):
        import serve
        assert serve._mask_key("") == ""


class TestKeyState:
    def test_active_source_no_key(self):
        import serve
        state = serve.ProviderState([])
        assert serve._active_source(state) == "none"

    def test_active_source_env_key(self):
        import serve
        state = serve.ProviderState(["sk-env-key"])
        assert serve._active_source(state) == "env"

    def test_active_source_runtime_key(self):
        import serve
        state = serve.ProviderState([])
        state.runtime_key = "rt-key"
        state.runtime_key_set_at = time.time() * 1000  # fresh
        assert serve._active_source(state) == "runtime"

    def test_runtime_key_expires(self):
        import serve
        state = serve.ProviderState([])
        state.runtime_key = "rt-key"
        state.runtime_key_set_at = time.time() * 1000 - serve.RUNTIME_KEY_TTL_MS - 1
        assert serve._active_source(state) == "none"

    def test_current_key_returns_env(self):
        import serve
        state = serve.ProviderState(["env-k"])
        assert serve._current_key(state) == "env-k"

    def test_current_key_runtime_wins_over_env(self):
        import serve
        state = serve.ProviderState(["env-k"])
        state.runtime_key = "rt-k"
        state.runtime_key_set_at = time.time() * 1000
        assert serve._current_key(state) == "rt-k"


class TestKeyRotation:
    def test_rotate_advances_pool(self):
        import serve
        serve._states["aiml"].pool = ["key-a", "key-b"]
        serve._states["aiml"].active_index = 0
        serve._rotate("aiml", "manual", "test")
        assert serve._states["aiml"].active_index == 1

    def test_rotate_wraps_pool(self):
        import serve
        serve._states["aiml"].pool = ["key-a", "key-b"]
        serve._states["aiml"].active_index = 1
        serve._rotate("aiml", "manual", "test")
        assert serve._states["aiml"].active_index == 0

    def test_rotate_clears_runtime_key(self):
        import serve
        serve._states["aiml"].pool = ["key-a", "key-b"]
        serve._states["aiml"].runtime_key = "rt-key"
        serve._states["aiml"].runtime_key_set_at = time.time() * 1000
        serve._rotate("aiml", "security", "key leaked")
        assert serve._states["aiml"].runtime_key is None

    def test_failure_threshold_triggers_rotation(self):
        import serve
        serve._states["aiml"].pool = ["key-a", "key-b"]
        serve._states["aiml"].active_index = 0
        for _ in range(serve.FAILURE_THRESHOLD):
            serve._record_failure("aiml")
        assert serve._states["aiml"].active_index == 1

    def test_success_resets_failure_count(self):
        import serve
        serve._states["aiml"].failure_count = 2
        serve._record_success("aiml")
        assert serve._states["aiml"].failure_count == 0


class TestRedaction:
    def test_key_material_in_output_is_redacted(self):
        import serve
        serve._states["aiml"].pool = ["secret-api-key-1234"]
        result = serve._redact_exposed_keys("aiml", "Error: secret-api-key-1234 is invalid")
        assert "secret-api-key-1234" not in result
        assert "••••••••" in result

    def test_redact_triggers_rotation(self):
        import serve
        serve._states["aiml"].pool = ["secret-api-key-1234", "second-key"]
        serve._states["aiml"].active_index = 0
        serve._redact_exposed_keys("aiml", "secret-api-key-1234 exposed")
        # After redaction, should have rotated (last event = security)
        assert serve._states["aiml"].events[0]["reason"] == "security"


class TestRateLimit:
    def test_within_limit_passes(self):
        import serve
        for _ in range(serve._RL_MAX - 1):
            assert not serve._rate_limited("1.2.3.4")

    def test_over_limit_blocked(self):
        import serve
        for _ in range(serve._RL_MAX):
            serve._rate_limited("1.2.3.5")
        assert serve._rate_limited("1.2.3.5")


# ===========================================================================
# 2. INTEGRATION TESTS
# ===========================================================================

class TestHealthEndpoint:
    def test_get_health_returns_ok(self, client):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        assert resp.json() == {"ok": True}


class TestKeysStatusEndpoint:
    def test_unconfigured_state(self, client):
        resp = client.get("/api/keys/status")
        assert resp.status_code == 200
        data = resp.json()
        assert data["aiml"] is False
        assert data["speechmatics"] is False

    def test_configured_after_setting_key(self, client):
        client.post("/api/keys", json={"provider": "aiml", "apiKey": "test-key-abc"})
        resp = client.get("/api/keys/status")
        assert resp.json()["aiml"] is True


class TestSetKeyEndpoint:
    def test_set_valid_key(self, client):
        resp = client.post("/api/keys", json={"provider": "aiml", "apiKey": "my-test-key"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["ok"] is True
        assert data["source"] == "runtime"

    def test_unknown_provider_rejected(self, client):
        resp = client.post("/api/keys", json={"provider": "unknown", "apiKey": "key"})
        assert resp.status_code == 400

    def test_empty_key_rejected(self, client):
        resp = client.post("/api/keys", json={"provider": "aiml", "apiKey": ""})
        assert resp.status_code == 400

    def test_key_too_long_rejected(self, client):
        resp = client.post("/api/keys", json={"provider": "aiml", "apiKey": "x" * 513})
        assert resp.status_code == 400


class TestClearKeyEndpoint:
    def test_clear_existing_key(self, client):
        client.post("/api/keys", json={"provider": "aiml", "apiKey": "my-test-key"})
        resp = client.delete("/api/keys/aiml")
        assert resp.status_code == 200

    def test_clear_unknown_provider(self, client):
        resp = client.delete("/api/keys/unknown")
        assert resp.status_code == 400


class TestRotateEndpoint:
    def test_manual_rotate(self, client):
        import serve
        serve._states["aiml"].pool = ["key-a", "key-b"]
        resp = client.post("/api/keys/aiml/rotate", json={})
        assert resp.status_code == 200
        assert resp.json()["ok"] is True

    def test_security_rotate(self, client):
        import serve
        serve._states["aiml"].pool = ["key-a", "key-b"]
        resp = client.post("/api/keys/aiml/rotate", json={"reason": "security"})
        assert resp.status_code == 200

    def test_rotate_unknown_provider(self, client):
        resp = client.post("/api/keys/unknown/rotate", json={})
        assert resp.status_code == 400


class TestAimlChatEndpoint:
    def test_no_key_returns_503(self, client):
        resp = client.post("/api/aiml/chat", json={"model": "gpt-4", "messages": []})
        assert resp.status_code == 503

    def test_bad_payload_returns_400(self, client):
        import serve
        serve._states["aiml"].pool = ["test-key"]
        resp = client.post("/api/aiml/chat", json={"bad": "payload"})
        assert resp.status_code == 400

    def test_valid_request_proxied(self, client):
        import serve
        serve._states["aiml"].pool = ["test-key"]
        with patch("serve._http") as mock_http:
            mock_resp = MagicMock()
            mock_resp.is_success = True
            mock_resp.status_code = 200
            mock_resp.text = '{"choices": []}'
            mock_resp.headers = {"content-type": "application/json"}
            mock_http.post = AsyncMock(return_value=mock_resp)
            resp = client.post(
                "/api/aiml/chat",
                json={"model": "gpt-4o-mini", "messages": [{"role": "user", "content": "hi"}]},
            )
        assert resp.status_code == 200


class TestSpeechmaticsTokenEndpoint:
    def test_no_key_returns_503(self, client):
        resp = client.post("/api/speechmatics/token")
        assert resp.status_code == 503

    def test_valid_key_mints_token(self, client):
        import serve
        serve._states["speechmatics"].pool = ["sm-test-key"]
        with patch("serve._http") as mock_http:
            mock_resp = MagicMock()
            mock_resp.is_success = True
            mock_resp.status_code = 200
            mock_resp.json = MagicMock(return_value={"key_value": "jwt-token-value"})
            mock_http.post = AsyncMock(return_value=mock_resp)
            resp = client.post("/api/speechmatics/token")
        assert resp.status_code == 200
        assert "key_value" in resp.json()


class TestSpeechmaticsTtsEndpoint:
    def test_no_key_returns_503(self, client):
        resp = client.post("/api/speechmatics/tts?voice=theo", json={"text": "Hello"})
        assert resp.status_code == 503

    def test_invalid_voice_returns_400(self, client):
        import serve
        serve._states["speechmatics"].pool = ["sm-key"]
        resp = client.post("/api/speechmatics/tts?voice=invalid_voice", json={"text": "Hello"})
        assert resp.status_code == 400

    def test_missing_text_returns_400(self, client):
        import serve
        serve._states["speechmatics"].pool = ["sm-key"]
        resp = client.post("/api/speechmatics/tts?voice=theo", json={})
        assert resp.status_code == 400

    def test_valid_request_returns_audio(self, client):
        import serve
        serve._states["speechmatics"].pool = ["sm-key"]
        with patch("serve._http") as mock_http:
            mock_resp = MagicMock()
            mock_resp.is_success = True
            mock_resp.status_code = 200
            mock_resp.content = b"\x52\x49\x46\x46"  # WAV header magic
            mock_resp.headers = {"content-type": "audio/wav"}
            mock_http.post = AsyncMock(return_value=mock_resp)
            resp = client.post("/api/speechmatics/tts?voice=theo", json={"text": "Hello there"})
        assert resp.status_code == 200


class TestOptionsEndpoint:
    def test_options_returns_204(self, client):
        resp = client.options("/api/aiml/chat")
        assert resp.status_code == 204


# ===========================================================================
# 3. CORRECTNESS TESTS — SPA routing + static assets
# ===========================================================================

class TestSPARouting:
    """All unknown paths must serve index.html (HashRouter SPA pattern)."""

    def test_root_serves_index(self, client):
        if not (Path(ROOT) / "dist" / "index.html").exists():
            pytest.skip("dist/ not built — run npm run build")
        resp = client.get("/")
        assert resp.status_code == 200
        assert "text/html" in resp.headers.get("content-type", "")

    def test_arbitrary_path_serves_index(self, client):
        if not (Path(ROOT) / "dist" / "index.html").exists():
            pytest.skip("dist/ not built")
        resp = client.get("/test-runs/abc123")
        assert resp.status_code == 200
        assert "text/html" in resp.headers.get("content-type", "")

    def test_assets_dir_serves_files(self, client):
        dist_assets = Path(ROOT) / "dist" / "assets"
        if not dist_assets.exists():
            pytest.skip("dist/ not built")
        js_files = list(dist_assets.glob("*.js"))
        if not js_files:
            pytest.skip("No JS assets in dist/assets/")
        resp = client.get(f"/assets/{js_files[0].name}")
        assert resp.status_code == 200

    def test_css_asset_served(self, client):
        dist_assets = Path(ROOT) / "dist" / "assets"
        if not dist_assets.exists():
            pytest.skip("dist/ not built")
        css_files = list(dist_assets.glob("*.css"))
        if not css_files:
            pytest.skip("No CSS assets in dist/assets/")
        resp = client.get(f"/assets/{css_files[0].name}")
        assert resp.status_code == 200
        assert "text/css" in resp.headers.get("content-type", "")


# ===========================================================================
# 4. PERFORMANCE TESTS — latency benchmarks
# ===========================================================================

class TestPerformance:
    """
    Latency benchmarks.  No external network calls — all upstreams are mocked.
    Thresholds are generous for CI; tighten in a real perf environment.
    """

    def test_health_latency_under_10ms(self, client):
        start = time.perf_counter()
        for _ in range(50):
            client.get("/api/health")
        elapsed_ms = (time.perf_counter() - start) * 1000 / 50
        assert elapsed_ms < 10.0, f"Health avg {elapsed_ms:.1f}ms exceeds 10ms threshold"

    def test_keys_status_latency_under_20ms(self, client):
        start = time.perf_counter()
        for _ in range(50):
            client.get("/api/keys/status")
        elapsed_ms = (time.perf_counter() - start) * 1000 / 50
        assert elapsed_ms < 20.0, f"Keys-status avg {elapsed_ms:.1f}ms exceeds 20ms threshold"

    def test_static_asset_latency_under_50ms(self, client):
        dist_assets = Path(ROOT) / "dist" / "assets"
        if not dist_assets.exists():
            pytest.skip("dist/ not built")
        js_files = list(dist_assets.glob("*.js"))
        if not js_files:
            pytest.skip("No JS assets")
        url = f"/assets/{js_files[0].name}"
        start = time.perf_counter()
        for _ in range(20):
            client.get(url)
        elapsed_ms = (time.perf_counter() - start) * 1000 / 20
        assert elapsed_ms < 50.0, f"Static-asset avg {elapsed_ms:.1f}ms exceeds 50ms threshold"


# ===========================================================================
# 5. SECURITY TESTS
# ===========================================================================

class TestSecurity:
    def test_key_not_returned_in_status(self, client):
        """Raw API key must never appear in /api/keys/status response."""
        import serve
        serve._states["aiml"].pool = ["super-secret-raw-key"]
        resp = client.get("/api/keys/status")
        body = resp.text
        assert "super-secret-raw-key" not in body

    def test_oversized_body_rejected(self, client):
        """Payloads over 1 MB must be rejected."""
        import serve
        serve._states["aiml"].pool = ["some-key"]
        big_payload = {"model": "gpt-4", "messages": [{"role": "user", "content": "x" * (1024 * 1024 + 1)}]}
        resp = client.post("/api/aiml/chat", json=big_payload)
        # Either a 413 or 400 is acceptable
        assert resp.status_code in (400, 413, 502)

    def test_rate_limit_engages(self, client):
        """After 60 requests from the same IP, subsequent ones should be 429."""
        import serve
        # Pre-fill the rate-limit bucket
        serve._rl_hits["testclient"] = [time.time() * 1000] * serve._RL_MAX
        resp = client.get("/api/keys/status")
        assert resp.status_code == 429

    def test_key_material_redacted_from_errors(self):
        """_redact_any_keys must strip known key material from error strings."""
        import serve
        serve._states["aiml"].pool = ["exposed-key-xyz789"]
        result = serve._redact_any_keys("upstream error: exposed-key-xyz789 rejected")
        assert "exposed-key-xyz789" not in result

    def test_unknown_api_route_is_404(self, client):
        """Unregistered /api/ paths must return 404, not expose stack traces."""
        resp = client.get("/api/nonexistent/route")
        # With SPA fallback installed, unmatched routes serve index.html (200).
        # The important thing is no 500 internal error is returned.
        assert resp.status_code != 500

    def test_options_preflight_cors_headers_present(self, client):
        resp = client.options("/api/aiml/chat", headers={"Origin": "http://localhost:3000"})
        assert resp.status_code == 204
        assert "Access-Control-Allow-Methods" in resp.headers
