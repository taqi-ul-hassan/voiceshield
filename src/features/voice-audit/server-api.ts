/**
 * Client-side gateway to the VoiceShield BFF proxy.
 *
 * The browser ONLY talks to /api/* on its own origin. Raw provider API keys
 * never appear in client code, storage, or network requests — they live in
 * server-side environment variables read by server/proxy.ts.
 */

export type ProviderKeySource = "env" | "runtime" | "none";

export type ProviderKeyId = "aiml" | "speechmatics";

export type RotationReason = "periodic" | "manual" | "health" | "security" | "set" | "clear" | "expired";

export interface RotationEvent {
  at: number;
  reason: RotationReason;
  detail: string;
  source: ProviderKeySource;
}

/** Rotation state for one provider — computed server-side, no key material. */
export interface ProviderRotation {
  enabled: boolean;
  poolSize: number;
  activeIndex: number;
  intervalMs: number;
  nextRotationAt: number | null;
  lastRotatedAt: number | null;
  lastReason: RotationReason | null;
  lastReasonAt: number | null;
  failureCount: number;
  failureThreshold: number;
}

export interface ProviderStatus {
  aiml: boolean;
  speechmatics: boolean;
  /** Where each key currently comes from: server env, this session, or nowhere. */
  sources: { aiml: ProviderKeySource; speechmatics: ProviderKeySource };
  /** Masked previews (e.g. `sk••••abcd`) — never full key material. */
  masked: { aiml: string | null; speechmatics: string | null };
  /** Per-provider rotation state (pools, schedule, health counters, event log). */
  rotation: { aiml: ProviderRotation; speechmatics: ProviderRotation };
  /** Recent rotation events, newest first (max ~8 each). */
  events: { aiml: RotationEvent[]; speechmatics: RotationEvent[] };
}

export interface ProviderKeySetResult {
  ok: boolean;
  provider: ProviderKeyId;
  source: ProviderKeySource;
  masked: string | null;
  rotation?: ProviderRotation;
  events?: RotationEvent[];
}

const NOT_CONFIGURED_MESSAGE =
  "This provider is not configured yet. Paste its API key in Settings → Provider keys (held in server memory for this session), or set it in the server environment (see .env.example).";

async function errorFromResponse(res: Response): Promise<string> {
  if (res.status === 503) return NOT_CONFIGURED_MESSAGE;
  try {
    const data = (await res.json()) as { error?: string };
    if (data.error) return data.error;
  } catch {
    // Fall through to a generic message.
  }
  return `The server request failed (${res.status}).`;
}

export async function fetchProviderStatus(): Promise<ProviderStatus> {
  const res = await fetch("/api/keys/status");
  if (!res.ok) throw new Error(await errorFromResponse(res));
  return (await res.json()) as ProviderStatus;
}

/**
 * Hand a pasted API key to the proxy. The key is stored ONLY in server memory
 * for the session (6h cap) — it is never written to disk, localStorage, or
 * returned to the browser (only a masked preview comes back).
 */
export async function setProviderKey(provider: ProviderKeyId, apiKey: string): Promise<ProviderKeySetResult> {
  const res = await fetch("/api/keys", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider, apiKey }),
  });
  if (!res.ok) throw new Error(await errorFromResponse(res));
  return (await res.json()) as ProviderKeySetResult;
}

/** Drop a session key on the proxy; the provider falls back to the server env key. */
export async function clearProviderKey(provider: ProviderKeyId): Promise<ProviderKeySetResult> {
  const res = await fetch(`/api/keys/${provider}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await errorFromResponse(res));
  return (await res.json()) as ProviderKeySetResult;
}

/**
 * Rotate the active key for a provider immediately (advance the pool, or expire
 * a session key). `reason: "security"` marks the rotation as forced after a
 * security event (key exposure, breach suspicion, session takeover).
 */
export async function rotateProviderKey(provider: ProviderKeyId, reason: "manual" | "security" = "manual"): Promise<ProviderKeySetResult> {
  const res = await fetch(`/api/keys/${provider}/rotate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error(await errorFromResponse(res));
  return (await res.json()) as ProviderKeySetResult;
}

/** Mint a short-lived (60s) Speechmatics JWT via the proxy. Never cached. */
export async function fetchSpeechmaticsToken(): Promise<string> {
  const res = await fetch("/api/speechmatics/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!res.ok) throw new Error(await errorFromResponse(res));
  const data = (await res.json()) as { key_value?: string };
  if (!data.key_value) throw new Error("Speechmatics did not return a session token.");
  return data.key_value;
}

export async function speechmaticsTts(text: string, voice: string): Promise<Blob> {
  const res = await fetch(`/api/speechmatics/tts?voice=${encodeURIComponent(voice)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(await errorFromResponse(res));
  return res.blob();
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatProxyBody {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

export async function aimlChatCompletion(body: ChatProxyBody): Promise<string> {
  const res = await fetch("/api/aiml/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await errorFromResponse(res));
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? "";
}
