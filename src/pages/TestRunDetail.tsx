import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, Code, Copy, FileText, Info, Printer, RotateCcw, ShieldAlert } from "lucide-react";
import StatusBadge from "../components/StatusBadge";
import { useRuntimeSettings } from "../features/voice-audit/runtime";
import { useStoredRuns } from "../features/voice-audit/storage";
import { SpeechButton } from "../features/voice-audit/speechmatics";
import type { AgentRole } from "../features/voice-audit/types";
import { copyText, formatDate } from "../lib/utils";
import { buildRemediatedSystemPrompt, generateMitigationsForRun } from "../features/voice-audit/mitigations";
import { getCustomPolicies } from "../features/voice-audit/custom-policies";
import { EU_ACT_POLICIES } from "../data/eu-act";

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

  const [activeTab, setActiveTab] = useState<"transcript" | "patches">("transcript");
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  if (!run) {
    return (
      <div className="text-center py-20">
        <h1 className="text-xl font-bold text-foreground mb-2">Run not found</h1>
        <p className="text-sm text-muted mb-6 leading-relaxed">This run may have been cleared from browser storage.</p>
        <button type="button" onClick={() => navigate("/test-runs")} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent text-background text-sm font-semibold hover:opacity-90 transition-all cursor-pointer active:scale-[0.97] shadow-sm">Back to Test Runs</button>
      </div>
    );
  }

  const liveFlags = run.violations.map((v) => ({
    ruleId: v.id,
    article: v.articleReference || "Article 5",
    severity: v.severity,
    description: v.description,
    excerpt: v.excerpt,
  }));

  const normalizedRun = {
    ...run,
    agentConfig: { name: roleLabels[run.agentConfig.role] || "Voice Agent", prompt: run.agentConfig.systemPrompt || "Voice Agent Prompt" },
    persona: { name: typeof run.persona === "string" ? run.persona : "Red Teamer" },
    flags: liveFlags,
    score: run.riskScore,
  };

  const allActivePolicies = [...EU_ACT_POLICIES, ...getCustomPolicies()];
  const patches = generateMitigationsForRun(normalizedRun as any, allActivePolicies);
  const remediatedSystemPrompt = buildRemediatedSystemPrompt(run.agentConfig.systemPrompt || "Standard System Prompt", patches);

  const handleCopyPrompt = async () => {
    const ok = await copyText(remediatedSystemPrompt);
    setCopied(ok);
    if (!ok) setCopyFailed(true);
    setTimeout(() => {
      setCopied(false);
      setCopyFailed(false);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <button type="button" onClick={() => navigate("/test-runs")} className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground cursor-pointer">
        <ArrowLeft className="w-4 h-4" /> Back to Test Runs
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">{roleLabels[run.agentConfig.role]} test</h1>
            <StatusBadge verdict={run.verdict} />
          </div>
          <p className="text-sm text-muted mt-1">{typeof run.persona === "string" ? run.persona : "Red Teamer"} persona · {formatDate(run.date)} · {run.duration}</p>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 border border-border/80 text-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-muted/30 transition-all self-start sm:self-auto"
        >
          <Printer className="w-4 h-4" /> Export EU AI Act Compliance PDF
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Verdict" value={run.verdict} capitalize />
        <Metric label="Risk level" value={run.riskLevel} capitalize />
        <Metric label="Risk score" value={`${run.riskScore}/100`} />
        <Metric label="Flags" value={String(run.violations.length)} />
      </div>

      <section className="bg-card rounded-2xl border border-border/80 shadow-sm p-6">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2 mb-3"><ShieldAlert className="w-4 h-4 text-accent" /> Evaluation Summary</h2>
        <p className="text-sm text-foreground/90 leading-relaxed">{run.summary}</p>
      </section>

      {/* Navigation Tabs */}
      <div className="border-b border-border/80 flex gap-6">
        <button
          type="button"
          onClick={() => setActiveTab("transcript")}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${activeTab === "transcript" ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground"}`}
        >
          <FileText className="w-4 h-4" /> Conversation Transcript ({run.utterances.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("patches")}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${activeTab === "patches" ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground"}`}
        >
          <Code className="w-4 h-4" /> Remediation Guardrail Patches ({patches.length})
        </button>
      </div>

      {activeTab === "transcript" ? (
        <>
          {run.violations.length > 0 && (
            <section className="bg-card rounded-2xl border border-border/80 shadow-sm p-6">
              <h2 className="text-base font-semibold text-foreground mb-4">EU AI Act Findings ({run.violations.length})</h2>
              <div className="space-y-3">
                {run.violations.map((violation) => (
                  <div key={violation.id} className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <span className="text-sm font-semibold text-foreground">{violation.articleReference}</span>
                      <span className="text-xs font-semibold uppercase text-destructive">{violation.severity}</span>
                    </div>
                    <p className="text-sm text-foreground/90">{violation.description}</p>
                    {violation.excerpt && <p className="text-xs text-muted italic mt-2">“{violation.excerpt}”</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="bg-card rounded-2xl border border-border/80 shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/80">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2"><FileText className="w-4 h-4 text-accent" /> Conversation Transcript</h2>
              <span className="text-xs text-muted">{run.utterances.length} turns</span>
            </div>
            <div className="px-6 py-5 space-y-4">
              {run.utterances.map((utterance) => {
                const isAgent = utterance.speaker === "agent";
                return (
                  <div key={utterance.id} className={`flex ${isAgent ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-xl px-4 py-3 ${isAgent ? "bg-muted/40 border border-border/80" : "bg-muted/20 border border-border/60"}`}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">{isAgent ? "Agent Draft" : "Caller Persona"}</span>
                        {isAgent && <StatusBadge verdict={utterance.verdict} size="sm" />}
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">{utterance.text}</p>
                      <SpeechButton text={utterance.text} voice={isAgent ? settings.draftVoice : settings.personVoice} />
                      {(utterance.verdict !== "pass" || utterance.articleReference) && <p className="flex items-start gap-1.5 text-xs text-muted mt-2"><Info className="w-3 h-3 mt-0.5 flex-shrink-0" />{utterance.rationale}</p>}
                      {utterance.articleReference && <p className="text-[10px] text-muted mt-1">Reference: {utterance.articleReference}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      ) : (
        <section className="bg-card rounded-2xl border border-border/80 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">Remediated System Prompt Patch</h2>
              <p className="text-xs text-muted">Auto-generated guardrails targeting identified EU AI Act violations.</p>
            </div>
            <div className="flex items-center gap-3">
              {copyFailed && <span className="text-xs text-destructive">Couldn't copy — the prompt is shown below, select it manually.</span>}
              <button
                type="button"
                onClick={handleCopyPrompt}
                className="inline-flex items-center gap-2 bg-accent text-background text-xs font-semibold px-3 py-1.5 rounded-md hover:opacity-90 transition-all active:scale-[0.97]"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? "Copied!" : "Copy Fixed Prompt"}
              </button>
            </div>
          </div>

          <div className="bg-background border border-border/80 rounded-lg p-4 font-mono text-xs text-foreground/90 overflow-x-auto whitespace-pre-wrap max-h-96">
            {remediatedSystemPrompt}
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Specific Rules Included ({patches.length})</h3>
            {patches.length === 0 ? (
              <p className="text-xs text-muted">No policy violations detected. Prompt is compliant.</p>
            ) : (
              patches.map((patch, idx) => (
                <div key={idx} className="bg-muted/20 border border-border/80 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-accent">{patch.article}</span>
                    <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-destructive/20 text-destructive">{patch.severity}</span>
                  </div>
                  <p className="text-xs font-semibold text-foreground">{patch.title}</p>
                  <p className="text-xs text-muted"><span className="font-bold text-foreground">Violation Excerpt:</span> "{patch.foundViolation}"</p>
                  <p className="text-xs text-accent"><span className="font-bold">Suggested Guardrail:</span> {patch.suggestedGuardrail}</p>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      <button type="button" onClick={() => navigate("/test-bench")} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent text-background text-sm font-semibold hover:opacity-90 transition-all cursor-pointer active:scale-[0.97] shadow-sm">
        <RotateCcw className="w-4 h-4" /> Run another test
      </button>
    </div>
  );
}

function Metric({ label, value, capitalize = false }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div className="bg-card rounded-xl border border-border/80 shadow-sm p-4">
      <p className="text-[10px] text-muted uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-semibold text-foreground mt-1 ${capitalize ? "capitalize" : ""}`}>{value}</p>
    </div>
  );
}
