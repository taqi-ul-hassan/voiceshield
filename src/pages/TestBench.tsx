import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SpeechButton, SpeechmaticsAudioPanel } from "../features/voice-audit/speechmatics";
import { advanceConversation, createConversation, evaluateConversation, submitCallerTurn } from "../features/voice-audit/conversation";
import { saveConversationRun } from "../features/voice-audit/storage";
import { useRuntimeSettings } from "../features/voice-audit/runtime";
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Test Bench</h1>
        <p className="text-sm text-gray-500 mt-1">Stress-test a voice agent with an adversarial caller and the EU AI Act evaluator.</p>
      </div>

      {!conversation ? (
        <section className="bg-card rounded-xl border border-gray-100 shadow-sm p-6 max-w-3xl">
          <div className="mb-6">
            <h2 className="text-base font-semibold text-gray-900">New live test</h2>
            <p className="text-sm text-gray-500 mt-1">Agent Person will challenge Agent Draft using the selected persona.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Target agent role">
              <select value={role} onChange={(event) => setRole(event.target.value as AgentRole)} className={inputClass}>
                <option value="airline">Airline Support</option>
                <option value="hospital">Hospital Services</option>
                <option value="police">Police Department</option>
                <option value="custom">Custom Agent</option>
              </select>
            </Field>
            <Field label="Adversarial persona">
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
            className="mt-6 px-5 py-2.5 rounded-lg bg-accent-blue text-white text-sm font-medium hover:bg-blue-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            Create conversation
          </button>
          <p className="text-xs text-gray-400 mt-3">Current AI mode: {settings.aiProvider === "mock" ? "Mock responses" : settings.aimlModel}</p>
        </section>
      ) : (
        <div className="space-y-6">
          <section className="bg-card rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Live conversation</h2>
                <p className="text-xs text-gray-500 mt-1">
                  {roleLabels[conversation.agentConfig.role]} · {personaLabels[conversation.persona]}
                  {conversation.agentConfig.customName ? ` · ${conversation.agentConfig.customName}` : ""}
                </p>
              </div>
              <button type="button" onClick={() => setConversation(null)} className="text-xs text-gray-500 hover:text-gray-800">Reset test</button>
            </div>

            <div className="space-y-3 max-h-[34rem] overflow-y-auto pr-1">
              {conversation.turns.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">Click “Generate next exchange” to begin.</div>
              )}
              {conversation.turns.map((turn) => {
                const isPerson = turn.speaker === "agent_person";
                return (
                  <div key={turn.id} className={`flex ${isPerson ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[85%] rounded-xl px-4 py-3 ${isPerson ? "bg-gray-50 border border-gray-100" : "bg-white border border-gray-200"}`}>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">{isPerson ? "Agent Person" : "Agent Draft"}</p>
                      <p className="text-sm text-gray-800 leading-relaxed">{turn.text}</p>
                      <SpeechButton text={turn.text} voice={isPerson ? settings.personVoice : settings.draftVoice} settings={settings} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-gray-100">
              <button type="button" onClick={handleAdvance} disabled={loading} className="px-4 py-2 rounded-lg bg-accent-blue text-white text-sm font-medium hover:bg-blue-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed">
                {loading ? "Processing..." : "Generate next exchange"}
              </button>
              <button type="button" onClick={() => void handleEvaluate()} disabled={!canEvaluate} className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed">
                {loading ? "Evaluating..." : "Evaluate conversation"}
              </button>
            </div>
          </section>

          <SpeechmaticsAudioPanel settings={settings} conversation={conversation} onCallerTurn={handleCallerTurn} />

          <section className="bg-card rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Manual caller turn</h2>
            <ManualTurn onSubmit={handleCallerTurn} disabled={loading} />
          </section>
        </div>
      )}

      {error && <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
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
      <button type="button" onClick={() => void submit()} disabled={disabled || !text.trim()} className="sm:self-end px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed">Send turn</button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-600 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

const inputClass = "w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue";
