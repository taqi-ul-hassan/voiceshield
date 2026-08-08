import { Clock, Eye, EyeOff, KeyRound, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ModeSwitcher, ThemeSwitcher } from "../components/AppearanceControls";
import { useRuntimeSettings } from "../features/voice-audit/runtime";
import {
    clearProviderKey,
    fetchProviderStatus,
    rotateProviderKey,
    setProviderKey,
    type ProviderKeyId,
    type ProviderKeySource,
    type ProviderRotation,
    type ProviderStatus,
    type RotationEvent,
    type RotationReason,
} from "../features/voice-audit/server-api";
import type { AgentRole, AIProvider, Persona, SpeechmaticsVoice } from "../features/voice-audit/types";

export default function Settings() {
  const { settings, updateSettings } = useRuntimeSettings();
  const [draft, setDraft] = useState(settings);
  const [saved, setSaved] = useState(false);
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [statusError, setStatusError] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchProviderStatus()
      .then((value) => {
        if (!cancelled) setStatus(value);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setStatusError(cause instanceof Error ? cause.message : "Unable to check provider status.");
      });
    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  const save = () => {
    updateSettings(draft);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const refreshStatus = () => setRefreshToken((value) => value + 1);

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-app-fg tracking-tight">Settings</h1>
        <p className="text-base text-app-muted mt-2">Configure providers, appearance, and default test parameters. Changes persist in this browser.</p>
      </header>

      <div className="max-w-2xl space-y-6">
        <section className="bg-app-card rounded-2xl border border-app-border shadow-sm p-6">
          <h2 className="text-base font-semibold text-app-fg">Appearance</h2>
          <p className="text-xs text-app-muted mt-1 mb-5">
            Switch between Developer and Public mode, and choose between the Rose and Noir color themes.
            Your choice is saved in this browser.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="App mode">
              <ModeSwitcher />
            </Field>
            <Field label="Color theme">
              <ThemeSwitcher />
            </Field>
          </div>
        </section>

        <section className="bg-app-card rounded-2xl border border-app-border shadow-sm p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-2.5">
              <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-ab" aria-hidden="true" />
              <div>
                <h2 className="text-base font-semibold text-app-fg">Provider keys</h2>
                <p className="text-xs text-app-muted mt-1">
                  Paste your own provider keys right here — no need to touch server files. Keys are sent to the app's
                  proxy, held in server memory for this session (up to 6 hours), and used to call providers on the app's
                  behalf. They are never written to disk or this browser, and never shown back to you. Keys rotate
                  automatically when the server is configured with a key pool.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={refreshStatus}
              disabled={!status && !statusError}
              className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-app-border bg-app-card px-3 py-1.5 text-xs font-medium text-app-fg shadow-sm transition-all duration-150 hover:bg-app-card-hover active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Refresh status
            </button>
          </div>

          {statusError ? (
            <div className="rounded-lg border border-fail-soft bg-fail-soft px-4 py-3 text-sm text-fail-text" role="alert">
              {statusError}
            </div>
          ) : !status ? (
            <div className="space-y-3" aria-busy="true">
              <KeyEntrySkeleton />
              <KeyEntrySkeleton />
            </div>
          ) : (
            <div className="space-y-4">
              <ProviderKeyCard
                label="AIML API key"
                description="Used for AI evaluation and agent simulation."
                provider="aiml"
                source={status.sources.aiml}
                masked={status.masked.aiml}
                configured={status.aiml}
                rotation={status.rotation.aiml}
                events={status.events.aiml}
                placeholder="sk-… (AIML)"
                onChanged={refreshStatus}
              />
              <ProviderKeyCard
                label="Speechmatics API key"
                description="Used for microphone transcription and per-turn speech playback."
                provider="speechmatics"
                source={status.sources.speechmatics}
                masked={status.masked.speechmatics}
                configured={status.speechmatics}
                rotation={status.rotation.speechmatics}
                events={status.events.speechmatics}
                placeholder="… (Speechmatics)"
                onChanged={refreshStatus}
              />
            </div>
          )}

          <div className="mt-5 flex items-start gap-2 rounded-lg border border-app-border bg-app-soft px-4 py-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-pass-text" aria-hidden="true" />
            <p className="text-xs text-app-muted">
              Keys stay server-side. If the proxy is restarted, session keys are cleared and you can paste them again.
              For production, prefer setting <code className="font-mono">AIML_API_KEYS</code> and{" "}
              <code className="font-mono">SPEECHMATICS_API_KEYS</code> (comma-separated pools for automatic rotation) in
              the server environment. The legacy single-key <code className="font-mono">AIML_API_KEY</code> and{" "}
              <code className="font-mono">SPEECHMATICS_API_KEY</code> variables still work.
            </p>
          </div>
        </section>

        <section className="bg-app-card rounded-2xl border border-app-border shadow-sm p-6">
          <h2 className="text-base font-semibold text-app-fg">AI Evaluation Provider</h2>
          <p className="text-xs text-app-muted mt-1 mb-5">
            API keys never enter the browser. They are read from the server environment (server/proxy.ts) or pasted in
            Provider keys above, and the proxy calls providers on the app's behalf.
          </p>
          <div className="space-y-4">
            <Field label="Provider">
              <select value={draft.aiProvider} onChange={(event) => setDraft({ ...draft, aiProvider: event.target.value as AIProvider })} className={inputClass}>
                <option value="mock">Mock mode (no key required)</option>
                <option value="aiml">AIML API</option>
              </select>
            </Field>
            <Field label="AIML model">
              <input value={draft.aimlModel} onChange={(event) => setDraft({ ...draft, aimlModel: event.target.value })} className={inputClass} />
            </Field>
            <ProviderStatusRow
              label="AIML API key"
              configured={status?.aiml ?? false}
              loading={!status && !statusError}
              error={statusError}
              hint="Paste a key in Provider keys above, or set AIML_API_KEY in the server .env file."
            />
          </div>
        </section>

        <section className="bg-app-card rounded-2xl border border-app-border shadow-sm p-6">
          <h2 className="text-base font-semibold text-app-fg">Speechmatics</h2>
          <p className="text-xs text-app-muted mt-1 mb-5">Used for microphone transcription and per-turn speech playback.</p>
          <div className="space-y-4">
            <ProviderStatusRow
              label="Speechmatics API key"
              configured={status?.speechmatics ?? false}
              loading={!status && !statusError}
              error={statusError}
              hint="Paste a key in Provider keys above, or set SPEECHMATICS_API_KEY in the server .env file."
            />
            <p className="text-xs text-app-muted">TTS voices are handled server-side — no client configuration needed.</p>
          </div>
        </section>

        <section className="bg-app-card rounded-2xl border border-app-border shadow-sm p-6">
          <h2 className="text-base font-semibold text-app-fg">Test Defaults</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
            <Field label="Default agent role">
              <select value={draft.defaultRole} onChange={(event) => setDraft({ ...draft, defaultRole: event.target.value as AgentRole })} className={inputClass}>
                <option value="airline">Airline Support</option>
                <option value="hospital">Hospital Services</option>
                <option value="police">Police Department</option>
                <option value="custom">Custom Agent</option>
              </select>
            </Field>
            <Field label="Default persona">
              <select value={draft.defaultPersona} onChange={(event) => setDraft({ ...draft, defaultPersona: event.target.value as Persona })} className={inputClass}>
                <option value="minor">Minor Client</option>
                <option value="crisis">Crisis Caller</option>
                <option value="refund">Refund Requester</option>
              </select>
            </Field>
            <Field label="Agent Person voice">
              <select value={draft.personVoice} onChange={(event) => setDraft({ ...draft, personVoice: event.target.value as SpeechmaticsVoice })} className={inputClass}>
                <VoiceOptions />
              </select>
            </Field>
            <Field label="Agent Draft voice">
              <select value={draft.draftVoice} onChange={(event) => setDraft({ ...draft, draftVoice: event.target.value as SpeechmaticsVoice })} className={inputClass}>
                <VoiceOptions />
              </select>
            </Field>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-app-muted">
            Provider keys stay server-side. Paste one in Provider keys above (session-only), or configure{" "}
            <code className="font-mono">.env</code> on the server.
          </p>
          <button type="button" onClick={save} className="px-5 py-2.5 rounded-full bg-ab text-ab-fg text-sm font-medium hover:opacity-90 active:scale-[0.97] transition-all duration-150 cursor-pointer shadow-sm">
            {saved ? "Saved" : "Save settings"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Provider key entry card ─────────────────────────────────────────────── */

function ProviderKeyCard({
  label,
  description,
  provider,
  source,
  masked,
  configured,
  rotation,
  events,
  placeholder,
  onChanged,
}: {
  label: string;
  description: string;
  provider: ProviderKeyId;
  source: ProviderKeySource;
  masked: string | null;
  configured: boolean;
  rotation: ProviderRotation;
  events: RotationEvent[];
  placeholder: string;
  onChanged: () => void;
}) {
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    if (!value.trim()) {
      setError("Paste a key first — the field is empty.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await setProviderKey(provider, value.trim());
      setValue("");
      setShow(false);
      setNotice(`Key saved to this session.`);
      onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't save that key — try again?");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await clearProviderKey(provider);
      setValue("");
      setShow(false);
      setNotice(source === "env" ? "Session key removed — the server env key is still active." : "Session key removed.");
      onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't remove that key — try again?");
    } finally {
      setBusy(false);
    }
  };

  const rotate = async () => {
    setRotating(true);
    setError("");
    setNotice("");
    try {
      await rotateProviderKey(provider);
      setValue("");
      setShow(false);
      setNotice("Rotated — the next key in the pool is now active.");
      onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't rotate that key — try again?");
    } finally {
      setRotating(false);
    }
  };

  const fieldId = `key-${provider}`;
  const errorId = `${fieldId}-error`;
  const noticeId = `${fieldId}-notice`;

  return (
    <div className="rounded-lg border border-app-border bg-app-soft p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-app-fg">{label}</p>
          <p className="text-xs text-app-muted mt-0.5">{description}</p>
        </div>
        <SourceBadge source={source} />
      </div>

      <div className="mt-3">
        <label htmlFor={fieldId} className="block text-xs font-medium text-app-muted mb-1.5">
          {configured ? "Replace key" : "Paste key"}
        </label>
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <input
              ref={inputRef}
              id={fieldId}
              type={show ? "text" : "password"}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void submit();
              }}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder={placeholder}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : notice ? noticeId : undefined}
              className="w-full px-3.5 py-2.5 pr-10 text-sm border border-app-border rounded-lg bg-app-input text-app-fg placeholder:text-app-muted focus:outline-none focus:ring-2 focus:ring-ab/30 focus:border-ab transition-colors duration-150 font-mono"
            />
            <button
              type="button"
              onClick={() => setShow((current) => !current)}
              aria-label={show ? "Hide key" : "Show key"}
              aria-pressed={show}
              className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-app-muted hover:text-app-fg transition-colors duration-150 cursor-pointer"
            >
              {show ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy || !value.trim()}
            className="shrink-0 px-4 py-2.5 rounded-lg bg-ab text-ab-fg text-sm font-medium hover:opacity-90 active:scale-[0.97] transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {busy ? "Saving…" : "Save key"}
          </button>
        </div>
      </div>

      {error && (
        <p id={errorId} role="alert" className="mt-2 text-xs text-fail-text">
          {error}
        </p>
      )}
      {!error && notice && (
        <p id={noticeId} className="mt-2 text-xs text-pass-text">
          {notice}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-app-muted">
        {masked ? (
          <span className="inline-flex items-center gap-1.5 font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-pass-text" aria-hidden="true" />
            Active: {masked}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-app-muted/50" aria-hidden="true" />
            No key configured yet
          </span>
        )}
        {source === "runtime" && (
          <button
            type="button"
            onClick={() => void remove()}
            disabled={busy}
            className="text-fail-text hover:underline underline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors duration-150"
          >
            Remove session key
          </button>
        )}
      </div>

      {/* Rotation status + controls */}
      <RotationPanel provider={provider} rotation={rotation} events={events} onRotate={() => void rotate()} busy={rotating} />
    </div>
  );
}

function RotationPanel({
  provider,
  rotation,
  events,
  onRotate,
  busy,
}: {
  provider: ProviderKeyId;
  rotation: ProviderRotation;
  events: RotationEvent[];
  onRotate: () => void;
  busy: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const nextAt = rotation.nextRotationAt ?? null;
  const poolText =
    rotation.poolSize >= 2 ? (
      <>
        Pool of <span className="font-medium text-app-fg">{rotation.poolSize}</span> keys · active{" "}
        <span className="font-mono text-app-fg">
          #{rotation.activeIndex + 1}
        </span>
      </>
    ) : (
      <span className="text-app-muted">Single server key</span>
    );

  return (
    <div className="mt-3 rounded-lg border border-app-border bg-app-card px-3.5 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-app-muted">
          <span className="inline-flex items-center gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            {rotation.enabled ? (
              <>
                Rotation on · {formatInterval(rotation.intervalMs)}
                {nextAt ? (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    next {formatCountdown(nextAt)}
                  </span>
                ) : null}
              </>
            ) : (
              <>Rotation off (add a key pool to enable)</>
            )}
          </span>
          {rotation.failureCount > 0 && (
            <span className="inline-flex items-center gap-1 text-flag-text">
              <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
              {rotation.failureCount}/{rotation.failureThreshold} failures — health rotation armed
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            className="text-xs font-medium text-ab hover:underline underline-offset-2 cursor-pointer transition-colors duration-150"
          >
            {expanded ? "Hide history" : "Rotation history"}
          </button>
          <button
            type="button"
            onClick={onRotate}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-app-border bg-app-soft px-3 py-1.5 text-xs font-medium text-app-fg hover:bg-app-soft2 active:scale-[0.97] transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} aria-hidden="true" />
            {busy ? "Rotating…" : "Rotate now"}
          </button>
        </div>
      </div>

      <p className="mt-1.5 text-xs text-app-muted">{poolText}</p>

      {expanded && (
        <RotationHistory
          provider={provider}
          events={events}
          lastReason={rotation.lastReason}
          lastReasonAt={rotation.lastReasonAt}
        />
      )}
    </div>
  );
}

function RotationHistory({
  provider,
  events,
  lastReason,
  lastReasonAt,
}: {
  provider: ProviderKeyId;
  events: RotationEvent[];
  lastReason: RotationReason | null;
  lastReasonAt: number | null;
}) {
  return (
    <div className="mt-3 space-y-2 border-t border-app-border pt-3" aria-label={`Rotation history for ${provider}`}>
      {lastReason && lastReasonAt && (
        <div className="flex items-start gap-2 text-xs">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pass-text" aria-hidden="true" />
          <div>
            <p className="text-app-fg font-medium">Last rotation: {rotationReasonLabel(lastReason)}</p>
            <p className="text-app-muted">{formatTimestamp(lastReasonAt)}</p>
          </div>
        </div>
      )}
      {events.length === 0 ? (
        <p className="text-xs text-app-muted">No rotation events recorded yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {events.map((event, index) => (
            <li key={`${event.at}-${index}`} className="flex items-start gap-2 text-xs">
              <span
                className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${rotationEventDot(event.reason)}`}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-app-fg">{event.detail}</p>
                <p className="text-app-muted">
                  {formatTimestamp(event.at)} · {rotationReasonLabel(event.reason)}
                  {event.source === "runtime" ? " · session key" : event.source === "env" ? " · server key" : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function rotationReasonLabel(reason: RotationReason): string {
  switch (reason) {
    case "periodic":
      return "Scheduled";
    case "manual":
      return "Manual";
    case "health":
      return "Health check";
    case "security":
      return "Security";
    case "set":
      return "Key set";
    case "clear":
      return "Key removed";
    case "expired":
      return "Session expired";
    default:
      return reason;
  }
}

function rotationEventDot(reason: RotationReason): string {
  switch (reason) {
    case "security":
      return "bg-flag-text";
    case "health":
      return "bg-flag-text/70";
    case "periodic":
      return "bg-pass-text/70";
    default:
      return "bg-app-muted/60";
  }
}

function formatInterval(ms: number): string {
  const units: Array<[string, number]> = [
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["min", 60_000],
    ["sec", 1000],
  ];
  for (const [label, size] of units) {
    if (ms % size === 0 && ms / size >= 1) {
      const value = ms / size;
      return `${value} ${label}${value === 1 ? "" : "s"}`;
    }
  }
  return `${Math.round(ms / 1000)} sec`;
}

function formatCountdown(timestamp: number): string {
  const diff = timestamp - Date.now();
  if (diff <= 0) return "now";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "in <1 min";
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? `in ${hours}h ${remainder}m` : `in ${hours}h`;
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SourceBadge({ source }: { source: ProviderKeySource }) {
  if (source === "env") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-app-soft2 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-app-muted">
        Server env
      </span>
    );
  }
  if (source === "runtime") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-pass-soft px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-pass-text">
        This session
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-flag-soft px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-flag-text">
      Not configured
    </span>
  );
}

function KeyEntrySkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-app-border bg-app-soft p-4">
      <div className="h-3.5 w-40 rounded bg-app-soft2" />
      <div className="mt-2 h-3 w-64 rounded bg-app-soft2" />
      <div className="mt-3 h-9 rounded-lg bg-app-soft2" />
    </div>
  );
}

function ProviderStatusRow({ label, configured, loading, error, hint }: { label: string; configured: boolean; loading: boolean; error: string; hint: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-app-border bg-app-soft px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-app-fg">{label}</p>
        <p className="text-xs text-app-muted mt-0.5 truncate">{loading ? "Checking server..." : configured ? "Configured on the server" : error || hint}</p>
      </div>
      {loading ? (
        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-app-muted/40" aria-hidden="true" />
      ) : (
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${configured ? "bg-pass-soft text-pass-text" : "bg-flag-soft text-flag-text"}`}
        >
          {configured ? "Configured" : "Not configured"}
        </span>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-app-muted mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function VoiceOptions() {
  return (
    <>
      <option value="sarah">Sarah (English UK, female)</option>
      <option value="theo">Theo (English UK, male)</option>
      <option value="megan">Megan (English UK, female)</option>
      <option value="jack">Jack (English US, male)</option>
    </>
  );
}

const inputClass = "w-full px-3.5 py-2.5 text-sm border border-app-border rounded-lg bg-app-input text-app-fg placeholder:text-app-muted focus:outline-none focus:ring-2 focus:ring-ab/30 focus:border-ab transition-colors duration-150";
