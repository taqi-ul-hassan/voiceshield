import { useState } from "react";
import { useRuntimeSettings } from "../features/voice-audit/runtime";
import type { AgentRole, AIProvider, Persona, SpeechmaticsVoice } from "../features/voice-audit/types";

export default function Settings() {
  const { settings, updateSettings, clearProviderKeys } = useRuntimeSettings();
  const [draft, setDraft] = useState(settings);
  const [showAIMLKey, setShowAIMLKey] = useState(false);
  const [showSpeechmaticsKey, setShowSpeechmaticsKey] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = () => {
    updateSettings(draft);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const clearKeys = () => {
    clearProviderKeys();
    setDraft((current) => ({ ...current, aimlApiKey: "", speechmaticsApiKey: "" }));
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure the browser demo and provider connections</p>
      </div>

      <div className="max-w-2xl space-y-6">
        <section className="bg-card rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900">AI Evaluation Provider</h2>
          <p className="text-xs text-gray-400 mt-1 mb-5">Keys are kept in memory only and disappear when this page is refreshed.</p>
          <div className="space-y-4">
            <Field label="Provider"><select value={draft.aiProvider} onChange={(event) => setDraft({ ...draft, aiProvider: event.target.value as AIProvider })} className={inputClass}><option value="mock">Mock mode (no key required)</option><option value="aiml">AIML API</option></select></Field>
            <Field label="AIML model"><input value={draft.aimlModel} onChange={(event) => setDraft({ ...draft, aimlModel: event.target.value })} className={inputClass} /></Field>
            <SecretField label="AIML API key" value={draft.aimlApiKey} visible={showAIMLKey} onToggle={() => setShowAIMLKey(!showAIMLKey)} onChange={(value) => setDraft({ ...draft, aimlApiKey: value })} placeholder="Enter a key for live AIML evaluation" />
          </div>
        </section>

        <section className="bg-card rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900">Speechmatics</h2>
          <p className="text-xs text-gray-400 mt-1 mb-5">Used for microphone transcription and per-turn speech playback.</p>
          <div className="space-y-4">
            <SecretField label="Speechmatics API key" value={draft.speechmaticsApiKey} visible={showSpeechmaticsKey} onToggle={() => setShowSpeechmaticsKey(!showSpeechmaticsKey)} onChange={(value) => setDraft({ ...draft, speechmaticsApiKey: value })} placeholder="Enter a Speechmatics key for audio" />
            <Field label="TTS endpoint"><input value={draft.speechmaticsTtsUrl} onChange={(event) => setDraft({ ...draft, speechmaticsTtsUrl: event.target.value })} className={inputClass} /></Field>
          </div>
        </section>

        <section className="bg-card rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900">Test Defaults</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
            <Field label="Default agent role"><select value={draft.defaultRole} onChange={(event) => setDraft({ ...draft, defaultRole: event.target.value as AgentRole })} className={inputClass}><option value="airline">Airline Support</option><option value="hospital">Hospital Services</option><option value="police">Police Department</option><option value="custom">Custom Agent</option></select></Field>
            <Field label="Default persona"><select value={draft.defaultPersona} onChange={(event) => setDraft({ ...draft, defaultPersona: event.target.value as Persona })} className={inputClass}><option value="minor">Minor Client</option><option value="crisis">Crisis Caller</option><option value="refund">Refund Requester</option></select></Field>
            <Field label="Agent Person voice"><select value={draft.personVoice} onChange={(event) => setDraft({ ...draft, personVoice: event.target.value as SpeechmaticsVoice })} className={inputClass}><VoiceOptions /></select></Field>
            <Field label="Agent Draft voice"><select value={draft.draftVoice} onChange={(event) => setDraft({ ...draft, draftVoice: event.target.value as SpeechmaticsVoice })} className={inputClass}><VoiceOptions /></select></Field>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={clearKeys} className="text-sm text-red-600 hover:underline">Clear provider keys</button>
          <button type="button" onClick={save} className="px-5 py-2.5 rounded-lg bg-accent-blue text-white text-sm font-medium hover:bg-blue-600">{saved ? "Saved" : "Save settings"}</button>
        </div>
      </div>
    </div>
  );
}

function SecretField({ label, value, visible, onToggle, onChange, placeholder }: { label: string; value: string; visible: boolean; onToggle: () => void; onChange: (value: string) => void; placeholder: string }) {
  return <div><label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label><div className="flex gap-2"><input type={visible ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`${inputClass} flex-1 font-mono`} /><button type="button" onClick={onToggle} className="px-3 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50">{visible ? "Hide" : "Show"}</button></div></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="block text-xs font-medium text-gray-600 mb-1.5">{label}</span>{children}</label>;
}

function VoiceOptions() {
  return <><option value="sarah">Sarah (English UK, female)</option><option value="theo">Theo (English UK, male)</option><option value="megan">Megan (English UK, female)</option><option value="jack">Jack (English US, male)</option></>;
}

const inputClass = "w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue";
