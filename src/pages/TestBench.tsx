import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { advanceConversation, createConversation, evaluateConversation, submitCallerTurn } from "../features/voice-audit/conversation";
import { useRuntimeSettings } from "../features/voice-audit/runtime";
import { SpeechButton, SpeechmaticsAudioPanel } from "../features/voice-audit/speechmatics";
import { saveConversationRun } from "../features/voice-audit/storage";
import type { AgentRole, Conversation, Persona } from "../features/voice-audit/types";

const roleLabels: Record<AgentRole, string> = {
  airline: "Airline Support",
  hospital: "Hospital Services",
  police: "Police Department",
  custom: "Custom Agent",
};

const personaLabels: Record<Persona, string> = {
  minor: "Minor Client",
  crisis: "Crisis Caller",
  refund: "Refund Requester",
};

export default function TestBench() {
  const navigate = useNavigate();
  const { settings } = useRuntimeSettings();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [role, setRole] = useState<AgentRole>(settings.defaultRole);
  const [persona, setPersona] = useState<Persona>(settings.defaultPersona);
  const [customName, setCustomName] = useState("");
  const [customPolicy, setCustomPolicy] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const startConversation = () => {
    setError("");
    setConversation(
      createConversation(
        {
          role,
          customName: role === "custom" ? customName : undefined,
          customPolicy: role === "custom" ? customPolicy : undefined,
        },
        persona
      )
    );
  };

  const runAction = async (action: () => Promise<Conversation>) => {
    setLoading(true);
    setError("");
    try {
      setConversation(await action());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The test action failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleAdvance = () => {
    if (!conversation) return;
    void runAction(() => advanceConversation(conversation, settings));
  };

  const handleCallerTurn = async (text: string) => {
    if (!conversation) return;
    const updated = await submitCallerTurn(conversation, text, settings);
    setConversation(updated);
  };

  const handleEvaluate = async () => {
    if (!conversation) return;
    setLoading(true);
    setError("");
    try {
      const evaluated = await evaluateConversation(conversation, settings);
      setConversation(evaluated);
      const run = saveConversationRun(evaluated);
      navigate(`/test-runs/${run.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Evaluation failed.");
    } finally {
      setLoading(false);
    }
  };

  const canEvaluate = Boolean(conversation && conversation.turns.length >= 2 && !loading);

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-app-fg tracking-tight">Test Bench</h1>
        <p className="text-base text-app-muted mt-2">Run a conversation, then see exactly where your agent stands against the EU AI Act.</p>
      </header>

      {!conversation ? (
        <section className="bg-app-card rounded-2xl border border-app-border shadow-sm p-6 max-w-3xl">
          <div className="mb-6">
            <h2 className="text-base font-semibold text-app-fg">Start a new test</h2>
            <p className="text-sm text-app-muted mt-1">A simulated caller will challenge your agent with realistic — and occasionally adversarial — scenarios.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Which agent are you testing?">
              <select value={role} onChange={(event) => setRole(event.target.value as AgentRole)} className={inputClass}>
                <option value="airline">Airline Support</option>
                <option value="hospital">Hospital Services</option>
                <option value="police">Police Department</option>
                <option value="custom">Custom Agent</option>
              </select>
            </Field>
            <Field label="Choose an adversarial persona">
              <select value={persona} onChange={(event) => setPersona(event.target.value as Persona)} className={inputClass}>
                <option value="minor">Minor Client</option>
                <option value="crisis">Crisis Caller</option>
                <option value="refund">Refund Requester</option>
              </select>
            </Field>
          </div>

          {role === "custom" && (
            <div className="grid grid-cols-1 gap-5 mt-5">
              <Field label="Organization name">
                <input value={customName} onChange={(event) => setCustomName(event.target.value)} placeholder="Example: Retail Bank" className={inputClass} />
              </Field>
              <Field label="Agent policy">
                <textarea value={customPolicy} onChange={(event) => setCustomPolicy(event.target.value)} rows={4} placeholder="Describe the rules this agent must follow..." className={`${inputClass} resize-y`} />
              </Field>
            </div>
          )}

          <button
            type="button"
            onClick={startConversation}
            disabled={role === "custom" && !customName.trim()}
            className="mt-6 px-5 py-2.5 rounded-full bg-ab text-ab-fg text-sm font-medium hover:opacity-90 active:scale-[0.97] transition-all duration-150 cursor-pointer disabled:bg-app-soft2 disabled:text-app-muted disabled:cursor-not-allowed shadow-sm"
          >
            Create conversation
          </button>
          <p className="text-xs text-app-muted mt-3">Current AI mode: {settings.aiProvider === "mock" ? "Mock responses" : settings.aimlModel}</p>
        </section>
      ) : (
        <div className="space-y-6">
          <section className="bg-app-card rounded-2xl border border-app-border shadow-sm p-6">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="text-base font-semibold text-app-fg">Live conversation</h2>
                <p className="text-xs text-app-muted mt-1">
                  {roleLabels[conversation.agentConfig.role]} · {personaLabels[conversation.persona]}
                  {conversation.agentConfig.customName ? ` · ${conversation.agentConfig.customName}` : ""}
                </p>
              </div>
              <button type="button" onClick={() => setConversation(null)} className="text-xs text-app-muted hover:text-app-fg cursor-pointer transition-colors duration-150">Reset test</button>
            </div>

            <div className="space-y-3 max-h-[34rem] overflow-y-auto pr-1">
              {conversation.turns.length === 0 && (
                <div className="rounded-2xl border border-dashed border-app-border-strong p-10 text-center text-sm text-app-muted leading-relaxed">
                  The conversation starts here. Press “Generate next exchange” and Agent Person
                  will make the first call.
                </div>
              )}
              {conversation.turns.map((turn) => {
                const isPerson = turn.speaker === "agent_person";
                return (
                  <div key={turn.id} className={`flex ${isPerson ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[85%] rounded-xl px-4 py-3 ${isPerson ? "bg-app-soft border border-app-border" : "bg-app-card border border-app-border-strong"}`}>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-app-muted mb-1">{isPerson ? "Agent Person" : "Agent Draft"}</p>
                      <p className="text-sm text-app-fg leading-relaxed">{turn.text}</p>
                      <SpeechButton text={turn.text} voice={isPerson ? settings.personVoice : settings.draftVoice} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-app-border">
              <button type="button" onClick={handleAdvance} disabled={loading} className="px-4 py-2 rounded-full bg-ab text-ab-fg text-sm font-medium hover:opacity-90 active:scale-[0.97] transition-all duration-150 cursor-pointer disabled:bg-app-soft2 disabled:text-app-muted disabled:cursor-not-allowed shadow-sm">
                {loading ? "Processing..." : "Generate next exchange"}
              </button>
              <button type="button" onClick={() => void handleEvaluate()} disabled={!canEvaluate} className="px-4 py-2 rounded-full bg-flag-text text-[#000] text-sm font-medium hover:opacity-90 active:scale-[0.97] transition-all duration-150 cursor-pointer disabled:bg-app-soft2 disabled:text-app-muted disabled:cursor-not-allowed shadow-sm">
                {loading ? "Evaluating..." : "Evaluate conversation"}
              </button>
            </div>
          </section>

          <SpeechmaticsAudioPanel settings={settings} conversation={conversation} onCallerTurn={handleCallerTurn} />

          <section className="bg-app-card rounded-2xl border border-app-border shadow-sm p-5">
            <h2 className="text-base font-semibold text-app-fg mb-3">Manual caller turn</h2>
            <ManualTurn onSubmit={handleCallerTurn} disabled={loading} />
          </section>
        </div>
      )}

      {error && (
        <div className="mt-5 rounded-xl border border-fail-text/30 bg-fail-soft px-4 py-3 text-sm text-fail-text" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

function ManualTurn({ onSubmit, disabled }: { onSubmit: (text: string) => Promise<void>; disabled: boolean }) {
  const [text, setText] = useState("");
  const submit = async () => {
    if (!text.trim()) return;
    await onSubmit(text);
    setText("");
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <textarea value={text} onChange={(event) => setText(event.target.value)} rows={2} placeholder="Type the caller's next message..." className={`${inputClass} flex-1 resize-y`} />
      <button type="button" onClick={() => void submit()} disabled={disabled || !text.trim()} className="sm:self-end px-4 py-2 rounded-lg bg-app-fg text-app-bg text-sm font-medium hover:opacity-90 active:scale-[0.97] transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">Send turn</button>
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

const inputClass = "w-full px-3.5 py-2.5 text-sm border border-app-border rounded-lg bg-app-input text-app-fg placeholder:text-app-muted focus:outline-none focus:ring-2 focus:ring-ab/30 focus:border-ab transition-colors duration-150";
