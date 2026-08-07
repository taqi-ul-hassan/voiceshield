/**
 * VoiceShield BFF proxy — the ONLY place provider API keys live.
 *
 * This small Node server holds provider keys server-side (environment
 * variables, see .env.example) and forwards provider calls on the app's
 * behalf. The browser never sees a raw key: it only talks to /api/* on the
 * app's own origin (Vite proxies /api here in dev).
 *
 * Key rotation (added on top of the runtime key store):
 *   - Pools: AIML_API_KEYS / SPEECHMATICS_API_KEYS may hold a comma-separated
 *     list of keys. The legacy single-key vars (AIML_API_KEY / ...) are still
 *     honored as a one-key pool when the plural vars are absent.
 *   - Periodic: the active pool key advances every KEY_ROTATION_INTERVAL
 *     (default 6h), cycling through the pool.
 *   - Manual: POST /api/keys/:provider/rotate advances immediately.
 *   - Health: N consecutive upstream failures with the active key
 *     (KEY_ROTATION_FAILURE_THRESHOLD, default 3) auto-rotate.
 *   - Security: POST /api/keys/:provider/rotate with reason "security" forces
 *     rotation (key exposure, breach suspicion, session takeover). The proxy
 *     also scans outgoing error text/log lines for active key material and
 *     redacts + rotates if it ever appears.
 * Every rotation is recorded in a small in-memory log exposed via
 * GET /api/keys/status (no key material, ever).
 *
 * Endpoints:
 *   GET  /api/health                      → { ok: true }
 *   GET  /api/keys/status                 → status + rotation info + event log
 *   POST /api/keys                        → store a user-pasted key (masked preview returned)
 *   DELETE /api/keys/:provider            → remove a runtime key (falls back to server pool)
 *   POST /api/keys/:provider/rotate       → rotate now (manual or security)
 *   POST /api/aiml/chat                   → forwards chat completions to AIML
 *   POST /api/speechmatics/token          → mints a 60s Speechmatics JWT
 *   POST /api/speechmatics/tts            → forwards TTS requests, returns audio
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/** Load `.env` (if present) for keys not already set in the real environment. */
function loadEnvFile(): void {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (key && process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // No .env file — rely on real environment variables only.
  }
}
loadEnvFile();

const PORT = Number(process.env.PROXY_PORT || process.env.PORT || 8787);
const AIML_URL = process.env.AIML_API_URL ?? "https://api.aimlapi.com/v1/chat/completions";
const SPEECHMATICS_MP_URL = "https://mp.speechmatics.com/v1/api_keys?type=rt";
const TTS_URL = (process.env.SPEECHMATICS_TTS_URL ?? "https://preview.tts.speechmatics.com").replace(/\/+$/, "");
const TTS_VOICES = new Set(["sarah", "theo", "megan", "jack"]);
const EXTRA_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const MAX_BODY_BYTES = 1024 * 1024; // 1 MB
const MAX_KEY_LENGTH = 512;
const MAX_EVENTS = 10;

/* ── Configuration helpers ────────────────────────────────────────────────── */
/** Parse "500", "30m", "6h", "1d" etc. into milliseconds (fallback on garbage). */
function parseDuration(value: string | undefined, fallbackMs: number): number {
  if (!value) return fallbackMs;
  const match = /^(\d+)\s*(ms|s|m|h|d)?$/i.exec(value.trim());
  if (!match) return fallbackMs;
  const amount = Number(match[1]);
  const unit = (match[2] ?? "ms").toLowerCase();
  const multiplier =
    unit === "ms" ? 1 : unit === "s" ? 1000 : unit === "m" ? 60_000 : unit === "h" ? 3_600_000 : 86_400_000;
  return amount * multiplier;
}

function parseThreshold(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 1 ? n : fallback;
}

function formatDuration(ms: number): string {
  const units: Array<[string, number]> = [
    ["d", 86_400_000],
    ["h", 3_600_000],
    ["m", 60_000],
    ["s", 1000],
  ];
  for (const [suffix, size] of units) {
    if (ms >= size && ms % size === 0) return `${ms / size}${suffix}`;
  }
  return `${ms}ms`;
}

const RUNTIME_KEY_TTL_MS = parseDuration(process.env.RUNTIME_KEY_TTL, 6 * 60 * 60 * 1000); // 6 hours
const ROTATION_INTERVAL_MS = parseDuration(process.env.KEY_ROTATION_INTERVAL, 6 * 60 * 60 * 1000); // 6 hours
const FAILURE_THRESHOLD = parseThreshold(process.env.KEY_ROTATION_FAILURE_THRESHOLD, 3);

/* ── Per-provider key state (pools + session keys + rotation) ────────────── */
type ProviderId = "aiml" | "speechmatics";
const PROVIDER_IDS: ProviderId[] = ["aiml", "speechmatics"];

type KeySource = "env" | "runtime" | "none";
type RotationReason = "periodic" | "manual" | "health" | "security" | "set" | "clear" | "expired";

interface RotationEvent {
  at: number;
  reason: RotationReason;
  detail: string;
  source: KeySource;
}

interface ProviderState {
  /** Server-side key pool (from env). A single-key pool = legacy env var. */
  pool: string[];
  /** Position of the active key inside `pool`. */
  activeIndex: number;
  /** Session key pasted from Settings → Provider keys. */
  runtimeKey: { key: string; setAt: number } | null;
  /** Consecutive upstream failures with the current key. */
  failureCount: number;
  lastRotatedAt: number | null;
  /** When the pool advances next (null when the pool has fewer than 2 keys). */
  nextRotationAt: number | null;
  events: RotationEvent[];
}

/** Build the key pool: plural env var wins, legacy singular var is a one-key pool. */
function parsePool(plural: string | undefined, singular: string | undefined): string[] {
  const list = (plural ?? "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
  if (list.length > 0) return list;
  const single = (singular ?? "").trim();
  return single ? [single] : [];
}

function createProviderState(provider: ProviderId): ProviderState {
  const pool =
    provider === "aiml"
      ? parsePool(process.env.AIML_API_KEYS, process.env.AIML_API_KEY)
      : parsePool(process.env.SPEECHMATICS_API_KEYS, process.env.SPEECHMATICS_API_KEY);
  return {
    pool,
    activeIndex: 0,
    runtimeKey: null,
    failureCount: 0,
    lastRotatedAt: null,
    nextRotationAt: pool.length >= 2 ? Date.now() + ROTATION_INTERVAL_MS : null,
    events: [],
  };
}

const providerStates: Record<ProviderId, ProviderState> = {
  aiml: createProviderState("aiml"),
  speechmatics: createProviderState("speechmatics"),
};

function pushEvent(state: ProviderState, reason: RotationReason, detail: string, source: KeySource): void {
  state.events.unshift({ at: Date.now(), reason, detail, source });
  if (state.events.length > MAX_EVENTS) state.events.length = MAX_EVENTS;
}

/** Where the active key currently comes from (expired session keys count as gone). */
function activeKeySource(state: ProviderState): KeySource {
  if (state.runtimeKey && Date.now() - state.runtimeKey.setAt < RUNTIME_KEY_TTL_MS) return "runtime";
  return state.pool.length > 0 ? "env" : "none";
}

/** The active key: session key if present, otherwise the pool key at activeIndex. */
function currentKey(state: ProviderState): string {
  const source = activeKeySource(state);
  if (source === "runtime" && state.runtimeKey) return state.runtimeKey.key;
  return state.pool[state.activeIndex] ?? "";
}

/**
 * Rotate: clear any session key, advance to the next pool key (when the pool
 * allows it), reset health counters, and log the event with its reason.
 */
function rotate(provider: ProviderId, reason: RotationReason, detail: string): void {
  const state = providerStates[provider];
  if (activeKeySource(state) === "runtime") state.runtimeKey = null;
  if (state.pool.length >= 2) state.activeIndex = (state.activeIndex + 1) % state.pool.length;
  state.failureCount = 0;
  state.lastRotatedAt = Date.now();
  state.nextRotationAt = state.pool.length >= 2 ? Date.now() + ROTATION_INTERVAL_MS : null;
  pushEvent(state, reason, detail, activeKeySource(state));
}

/** Lazy scheduled rotation: advance the pool on an interval while the server runs. */
function maybeRotatePeriodically(state: ProviderState): void {
  if (state.pool.length < 2) return;
  const now = Date.now();
  if (state.nextRotationAt === null) {
    state.nextRotationAt = now + ROTATION_INTERVAL_MS;
    return;
  }
  if (now < state.nextRotationAt) return;
  state.activeIndex = (state.activeIndex + 1) % state.pool.length;
  state.lastRotatedAt = now;
  state.nextRotationAt = now + ROTATION_INTERVAL_MS;
  pushEvent(state, "periodic", "Scheduled rotation — advanced to the next key in the pool", activeKeySource(state));
}

/** Resolve the active key for a provider call, applying TTL expiry + lazy rotation. */
function resolveKey(provider: ProviderId): string {
  const state = providerStates[provider];
  if (state.runtimeKey && Date.now() - state.runtimeKey.setAt >= RUNTIME_KEY_TTL_MS) {
    state.runtimeKey = null;
    state.lastRotatedAt = Date.now();
    pushEvent(state, "expired", "Session key expired after its TTL — fell back to the server pool", activeKeySource(state));
  }
  maybeRotatePeriodically(state);
  return currentKey(state);
}

/** Count an upstream failure; auto-rotate once the consecutive-failure threshold is hit. */
function recordFailure(provider: ProviderId): void {
  const state = providerStates[provider];
  state.failureCount += 1;
  const canRotate = state.pool.length >= 2 || activeKeySource(state) === "runtime";
  if (!canRotate) {
    // Nothing to rotate to (single env key) — cap the counter instead of growing forever.
    state.failureCount = Math.min(state.failureCount, FAILURE_THRESHOLD);
    return;
  }
  if (state.failureCount >= FAILURE_THRESHOLD) {
    rotate(provider, "health", `Rotated after ${FAILURE_THRESHOLD} consecutive provider failures with the active key`);
  }
}

function recordSuccess(provider: ProviderId): void {
  providerStates[provider].failureCount = 0;
}

function maskKey(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return `${key.slice(0, 2)}••••`;
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

/**
 * Security-event rotation: scan a string for any active key material. If found,
 * redact it AND rotate immediately (a key that leaked into output is treated as
 * compromised). Used before forwarding error text or writing log lines.
 */
function redactExposedKeys(provider: ProviderId, message: string): string {
  const state = providerStates[provider];
  const keys = new Set<string>();
  if (state.runtimeKey) keys.add(state.runtimeKey.key);
  for (const key of state.pool) if (key) keys.add(key);
  let output = message;
  let exposed = false;
  for (const key of keys) {
    if (key.length >= 8 && output.includes(key)) {
      exposed = true;
      output = output.split(key).join("••••••••");
    }
  }
  if (exposed) {
    rotate(provider, "security", "Active key material appeared in provider output — rotated immediately to protect the key");
  }
  return output;
}

function redactAnyKeys(message: string): string {
  let output = message;
  for (const provider of PROVIDER_IDS) output = redactExposedKeys(provider, output);
  return output;
}

function keyStatus(provider: ProviderId) {
  const state = providerStates[provider];
  const source = activeKeySource(state);
  const key = currentKey(state);
  const rotationEnabled = state.pool.length >= 2;
  return {
    configured: Boolean(key),
    source,
    masked: key ? maskKey(key) : null,
    rotation: {
      enabled: rotationEnabled,
      poolSize: state.pool.length,
      activeIndex: state.activeIndex,
      intervalMs: ROTATION_INTERVAL_MS,
      nextRotationAt: rotationEnabled ? state.nextRotationAt : null,
      lastRotatedAt: state.lastRotatedAt,
      lastReason: state.events[0]?.reason ?? null,
      lastReasonAt: state.events[0]?.at ?? null,
      failureCount: state.failureCount,
      failureThreshold: FAILURE_THRESHOLD,
    },
    events: state.events.slice(0, 8),
  };
}

/* ── Basic rate limiting (per client IP, in-memory) ─────────────────────── */
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 60;
const hits = new Map<string, number[]>();

function clientIp(req: IncomingMessage): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) return forwarded.split(",")[0].trim();
  return req.socket.remoteAddress ?? "unknown";
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  if (hits.size > 10_000) hits.clear();
  const recent = (hits.get(ip) ?? []).filter((timestamp) => timestamp >= cutoff);
  if (recent.length >= RATE_LIMIT_MAX) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

/* ── CORS: allow same-origin, localhost, and explicit allow-list ────────── */
function originAllowed(req: IncomingMessage): boolean {
  const origin = req.headers.origin;
  if (!origin) return true; // same-origin / non-browser client
  try {
    const originHost = new URL(origin).host;
    if (originHost === (req.headers.host ?? "")) return true; // same-origin
    if (EXTRA_ORIGINS.includes(origin)) return true;
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  } catch {
    return false;
  }
  return false;
}

function applyCorsHeaders(req: IncomingMessage, res: ServerResponse): void {
  const origin = req.headers.origin;
  if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
}

/* ── Small JSON helpers ──────────────────────────────────────────────────── */
function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(payload));
}

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolvePromise, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let tooLarge = false;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        tooLarge = true;
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (tooLarge) {
        reject(new Error("Payload too large"));
        return;
      }
      if (chunks.length === 0) {
        resolvePromise({});
        return;
      }
      try {
        resolvePromise(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

/* ── Route handlers ──────────────────────────────────────────────────────── */
async function handleAimlChat(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const key = resolveKey("aiml");
  if (!key) {
    sendJson(res, 503, {
      error:
        "AIML is not configured yet. Paste an AIML API key in Settings → Provider keys (held in server memory for this session), or set AIML_API_KEYS / AIML_API_KEY on the server.",
    });
    return;
  }
  const body = (await readJsonBody(req)) as {
    model?: unknown;
    messages?: unknown;
    temperature?: unknown;
    max_tokens?: unknown;
  } | null;
  if (!body || typeof body !== "object" || typeof body.model !== "string" || !Array.isArray(body.messages)) {
    sendJson(res, 400, { error: "Request must include a 'model' string and a 'messages' array." });
    return;
  }
  let upstream: Response;
  try {
    upstream = await fetch(AIML_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: body.model,
        messages: body.messages,
        temperature: body.temperature,
        max_tokens: body.max_tokens,
      }),
    });
  } catch (cause) {
    recordFailure("aiml");
    throw new Error(`AIML request failed: ${cause instanceof Error ? cause.message : "network error"}`);
  }
  const text = await upstream.text();
  if (!upstream.ok) {
    recordFailure("aiml");
    // Redact (and auto-rotate on) any key material echoed back by the provider.
    res.writeHead(upstream.status, {
      "Content-Type": upstream.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-store",
    });
    res.end(redactExposedKeys("aiml", text));
    return;
  }
  recordSuccess("aiml");
  res.writeHead(upstream.status, {
    "Content-Type": upstream.headers.get("content-type") ?? "application/json",
    "Cache-Control": "no-store",
  });
  res.end(text);
}

async function handleSpeechmaticsToken(_req: IncomingMessage, res: ServerResponse): Promise<void> {
  const key = resolveKey("speechmatics");
  if (!key) {
    sendJson(res, 503, {
      error:
        "Speechmatics is not configured yet. Paste a Speechmatics API key in Settings → Provider keys (held in server memory for this session), or set SPEECHMATICS_API_KEYS / SPEECHMATICS_API_KEY on the server.",
    });
    return;
  }
  // Mint a short-lived JWT so the raw key never leaves the server.
  let upstream: Response;
  try {
    upstream = await fetch(SPEECHMATICS_MP_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ttl: 60 }),
    });
  } catch (cause) {
    recordFailure("speechmatics");
    throw new Error(`Speechmatics token request failed: ${cause instanceof Error ? cause.message : "network error"}`);
  }
  const data = (await upstream.json()) as { key_value?: string; message?: string };
  if (!upstream.ok || !data.key_value) {
    recordFailure("speechmatics");
    const safeMessage = redactExposedKeys("speechmatics", data.message ?? "Speechmatics token request failed.");
    sendJson(res, upstream.ok ? 502 : upstream.status, { error: safeMessage });
    return;
  }
  recordSuccess("speechmatics");
  sendJson(res, 200, { key_value: data.key_value });
}

async function handleSpeechmaticsTts(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const key = resolveKey("speechmatics");
  if (!key) {
    sendJson(res, 503, {
      error:
        "Speechmatics is not configured yet. Paste a Speechmatics API key in Settings → Provider keys (held in server memory for this session), or set SPEECHMATICS_API_KEYS / SPEECHMATICS_API_KEY on the server.",
    });
    return;
  }
  const url = new URL(req.url ?? "/", "http://localhost");
  const voice = url.searchParams.get("voice") ?? "theo";
  if (!TTS_VOICES.has(voice)) {
    sendJson(res, 400, { error: `Unsupported TTS voice: ${voice}` });
    return;
  }
  const body = (await readJsonBody(req)) as { text?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) {
    sendJson(res, 400, { error: "Missing 'text' in the request body." });
    return;
  }
  let upstream: Response;
  try {
    upstream = await fetch(`${TTS_URL}/generate/${encodeURIComponent(voice)}?output_format=wav_16000`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch (cause) {
    recordFailure("speechmatics");
    throw new Error(`Speechmatics TTS request failed: ${cause instanceof Error ? cause.message : "network error"}`);
  }
  const audio = await upstream.arrayBuffer();
  if (!upstream.ok) {
    recordFailure("speechmatics");
  } else {
    recordSuccess("speechmatics");
  }
  res.writeHead(upstream.status, {
    "Content-Type": upstream.headers.get("content-type") ?? "audio/wav",
    "Cache-Control": "no-store",
  });
  res.end(Buffer.from(audio));
}

/* ── Runtime key store + rotation handlers ───────────────────────────────── */
function keyResultPayload(provider: ProviderId) {
  const status = keyStatus(provider);
  return {
    ok: true,
    provider,
    source: status.source,
    masked: status.masked,
    rotation: status.rotation,
    events: status.events,
  };
}

async function handleSetProviderKey(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = (await readJsonBody(req)) as { provider?: unknown; apiKey?: unknown } | null;
  const provider = body?.provider;
  const apiKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : "";
  if (typeof provider !== "string" || !PROVIDER_IDS.includes(provider as ProviderId)) {
    sendJson(res, 400, { error: "Unknown provider. Use 'aiml' or 'speechmatics'." });
    return;
  }
  if (!apiKey) {
    sendJson(res, 400, { error: "The API key must not be empty." });
    return;
  }
  if (apiKey.length > MAX_KEY_LENGTH) {
    sendJson(res, 400, { error: "The API key is too long (max 512 characters)." });
    return;
  }
  const state = providerStates[provider as ProviderId];
  state.runtimeKey = { key: apiKey, setAt: Date.now() };
  state.failureCount = 0;
  state.lastRotatedAt = Date.now();
  pushEvent(state, "set", "New session key pasted in Settings → Provider keys", "runtime");
  sendJson(res, 200, keyResultPayload(provider as ProviderId));
}

async function handleClearProviderKey(req: IncomingMessage, res: ServerResponse, provider: ProviderId): Promise<void> {
  const state = providerStates[provider];
  if (state.runtimeKey) {
    state.runtimeKey = null;
    state.lastRotatedAt = Date.now();
    pushEvent(state, "clear", "Session key removed from Settings — fell back to the server pool", activeKeySource(state));
  }
  sendJson(res, 200, keyResultPayload(provider));
}

async function handleRotateProviderKey(req: IncomingMessage, res: ServerResponse, provider: ProviderId): Promise<void> {
  const body = (await readJsonBody(req)) as { reason?: unknown } | null;
  const reason = body?.reason === "security" ? "security" : "manual";
  if (reason === "security") {
    rotate(provider, "security", "Forced rotation after a security event (key exposure, breach suspicion, or session takeover)");
  } else {
    rotate(provider, "manual", "Rotated manually from Settings → Provider keys");
  }
  sendJson(res, 200, keyResultPayload(provider));
}

/* ── Router ──────────────────────────────────────────────────────────────── */
async function route(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const method = req.method ?? "GET";
  const path = new URL(req.url ?? "/", "http://localhost").pathname;

  if (!originAllowed(req)) {
    sendJson(res, 403, { error: "Cross-origin requests are not allowed by the BFF proxy." });
    return;
  }
  applyCorsHeaders(req, res);

  if (rateLimited(clientIp(req))) {
    sendJson(res, 429, { error: "Too many requests. Please try again in a moment." });
    return;
  }

  if (method === "GET" && path === "/api/health") {
    sendJson(res, 200, { ok: true });
    return;
  }
  if (method === "GET" && path === "/api/keys/status") {
    const aiml = keyStatus("aiml");
    const speechmatics = keyStatus("speechmatics");
    sendJson(res, 200, {
      aiml: aiml.configured,
      speechmatics: speechmatics.configured,
      sources: { aiml: aiml.source, speechmatics: speechmatics.source },
      masked: { aiml: aiml.masked, speechmatics: speechmatics.masked },
      rotation: { aiml: aiml.rotation, speechmatics: speechmatics.rotation },
      events: { aiml: aiml.events, speechmatics: speechmatics.events },
    });
    return;
  }
  if (method === "POST" && path === "/api/speechmatics/token") {
    await handleSpeechmaticsToken(req, res);
    return;
  }
  if (method === "POST" && path === "/api/speechmatics/tts") {
    await handleSpeechmaticsTts(req, res);
    return;
  }
  if (method === "POST" && path === "/api/aiml/chat") {
    await handleAimlChat(req, res);
    return;
  }
  if (method === "POST" && path === "/api/keys") {
    await handleSetProviderKey(req, res);
    return;
  }
  if (method === "POST") {
    const rotateMatch = path.match(/^\/api\/keys\/([a-z]+)\/rotate$/);
    if (rotateMatch) {
      const provider = rotateMatch[1] as ProviderId;
      if (!PROVIDER_IDS.includes(provider)) {
        sendJson(res, 400, { error: "Unknown provider. Use 'aiml' or 'speechmatics'." });
        return;
      }
      await handleRotateProviderKey(req, res, provider);
      return;
    }
  }
  const keyMatch = method === "DELETE" ? path.match(/^\/api\/keys\/([a-z]+)$/) : null;
  if (keyMatch) {
    const provider = keyMatch[1] as ProviderId;
    if (!PROVIDER_IDS.includes(provider)) {
      sendJson(res, 400, { error: "Unknown provider. Use 'aiml' or 'speechmatics'." });
      return;
    }
    await handleClearProviderKey(req, res, provider);
    return;
  }
  if (method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    res.end();
    return;
  }

  sendJson(res, 404, { error: "Not found." });
}

const server = createServer((req, res) => {
  void route(req, res).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : "Proxy request failed.";
    // Never let key material reach a log line — redact + rotate if it appears.
    console.error(`[proxy] ${req.method ?? "?"} ${req.url ?? "/"} failed:`, redactAnyKeys(message));
    if (!res.headersSent) {
      const status = message.includes("Payload too large") ? 413 : message.includes("Invalid JSON") ? 400 : 502;
      sendJson(res, status, {
        error: status === 502 ? "The upstream provider request failed. Check the server logs." : redactAnyKeys(message),
      });
    } else {
      res.end();
    }
  });
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    // A previous dev session still holds the port (e.g. an unclean shutdown).
    // Exit quietly so `concurrently -k` does not cascade a cryptic crash —
    // `scripts/ensure-dev-ports.mjs` cleans stale processes on the next start.
    console.error(
      `[proxy] Port ${PORT} is already in use — is another VoiceShield dev session running?\n` +
        `[proxy] Kill the stale process (see scripts/ensure-dev-ports.mjs) or start with a free PROXY_PORT.`
    );
  } else {
    console.error(`[proxy] Failed to start on port ${PORT}:`, err.message);
  }
  process.exit(1);
});

server.listen(PORT, () => {
  const aimlState = providerStates.aiml;
  const speechmaticsState = providerStates.speechmatics;
  console.log(`[proxy] BFF proxy listening on http://localhost:${PORT}`);
  console.log(
    `[proxy] AIML: pool of ${aimlState.pool.length} key(s) | Speechmatics: pool of ${speechmaticsState.pool.length} key(s)`
  );
  console.log(
    `[proxy] Rotation: interval ${formatDuration(ROTATION_INTERVAL_MS)} | failure threshold ${FAILURE_THRESHOLD} | session TTL ${formatDuration(RUNTIME_KEY_TTL_MS)}`
  );
});
