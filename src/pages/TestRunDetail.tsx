import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileText, Info, RotateCcw, ShieldAlert } from "lucide-react";
import StatusBadge from "../components/StatusBadge";
import { useRuntimeSettings } from "../features/voice-audit/runtime";
import { useStoredRuns } from "../features/voice-audit/storage";
import { SpeechButton } from "../features/voice-audit/speechmatics";
import type { AgentRole } from "../features/voice-audit/types";
import { formatDate } from "../lib/utils";

const roleLabels: Record<AgentRole, string> = {
  airline: "Airline Support",
  hospital: "Hospital Services",
  police: "Police Department",
  custom: "Custom Agent",
};

export default function TestRunDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const runs = useStoredRuns();
  const { settings } = useRuntimeSettings();
  const run = runs.find((item) => item.id === id);

  if (!run) {
    return (
      <div className="text-center py-16">
        <p className="text-lg font-medium text-gray-900 mb-2">Run not found</p>
        <p className="text-sm text-gray-500 mb-4">This run may have been cleared from browser storage.</p>
        <button type="button" onClick={() => navigate("/test-runs")} className="text-accent-blue text-sm font-medium hover:underline">Back to Test Runs</button>
      </div>
    );
  }

  return (
    <div>
      <button type="button" onClick={() => navigate("/test-runs")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Test Runs
      </button>

      <div className="mb-8">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-gray-900">{roleLabels[run.agentConfig.role]} test</h1>
          <StatusBadge verdict={run.verdict} />
        </div>
        <p className="text-sm text-gray-500 mt-1">{run.persona} persona · {formatDate(run.date)} · {run.duration}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Metric label="Verdict" value={run.verdict} capitalize />
        <Metric label="Risk level" value={run.riskLevel} capitalize />
        <Metric label="Risk score" value={`${run.riskScore}/100`} />
        <Metric label="Flags" value={String(run.violations.length)} />
      </div>

      <section className="bg-card rounded-xl border border-gray-100 shadow-sm p-6 mb-8">
        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-3"><ShieldAlert className="w-4 h-4 text-gray-400" /> Evaluation Summary</h2>
        <p className="text-sm text-gray-700 leading-relaxed">{run.summary}</p>
      </section>

      {run.violations.length > 0 && (
        <section className="bg-card rounded-xl border border-gray-100 shadow-sm p-6 mb-8">
          <h2 className="text-base font-semibold text-gray-900 mb-4">EU AI Act Findings ({run.violations.length})</h2>
          <div className="space-y-3">
            {run.violations.map((violation) => (
              <div key={violation.id} className="rounded-lg border border-red-100 bg-red-50 p-4">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className="text-sm font-semibold text-gray-900">{violation.articleReference}</span>
                  <span className="text-xs font-semibold uppercase text-red-700">{violation.severity}</span>
                </div>
                <p className="text-sm text-gray-700">{violation.description}</p>
                {violation.excerpt && <p className="text-xs text-gray-500 italic mt-2">“{violation.excerpt}”</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="bg-card rounded-xl border border-gray-100 shadow-sm mb-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2"><FileText className="w-4 h-4 text-gray-400" /> Conversation Transcript</h2>
          <span className="text-xs text-gray-400">{run.utterances.length} turns</span>
        </div>
        <div className="px-6 py-5 space-y-4">
          {run.utterances.map((utterance) => {
            const isAgent = utterance.speaker === "agent";
            return (
              <div key={utterance.id} className={`flex ${isAgent ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-xl px-4 py-3 ${isAgent ? "bg-white border border-gray-200" : "bg-gray-50 border border-gray-100"}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{isAgent ? "Agent Draft" : "Agent Person"}</span>
                    {isAgent && <StatusBadge verdict={utterance.verdict} size="sm" />}
                  </div>
                  <p className="text-sm text-gray-800 leading-relaxed">{utterance.text}</p>
                  <SpeechButton text={utterance.text} voice={isAgent ? settings.draftVoice : settings.personVoice} settings={settings} />
                  {(utterance.verdict !== "pass" || utterance.articleReference) && <p className="flex items-start gap-1.5 text-xs text-gray-500 mt-2"><Info className="w-3 h-3 mt-0.5 flex-shrink-0" />{utterance.rationale}</p>}
                  {utterance.articleReference && <p className="text-[10px] text-gray-400 mt-1">Reference: {utterance.articleReference}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <button type="button" onClick={() => navigate("/test-bench")} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent-blue text-white text-sm font-medium hover:bg-blue-600">
        <RotateCcw className="w-4 h-4" /> Run another test
      </button>
    </div>
  );
}

function Metric({ label, value, capitalize = false }: { label: string; value: string; capitalize?: boolean }) {
  return <div className="bg-card rounded-xl border border-gray-100 shadow-sm p-4"><p className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</p><p className={`text-lg font-semibold text-gray-900 mt-1 ${capitalize ? "capitalize" : ""}`}>{value}</p></div>;
}
