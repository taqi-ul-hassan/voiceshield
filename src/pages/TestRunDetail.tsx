import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  ArrowLeft,
  Loader2,
  Info,
  RotateCcw,
  ExternalLink,
  Shield,
  FileText,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Zap,
} from "lucide-react";
import { testRuns, scenarios, policies } from "../data/demo";
import { formatDate, cn } from "../lib/utils";
import StatusBadge from "../components/StatusBadge";

export default function TestRunDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [rerunning, setRerunning] = useState(false);
  const [patchApplied, setPatchApplied] = useState(false);
  const [showAllRationales, setShowAllRationales] = useState(false);

  const run = testRuns.find((r) => r.id === id);
  const scenario = run
    ? scenarios.find((s) => s.id === run.scenarioId)
    : null;

  // Resolve the related fail run for a rerun (comparison)
  const relatedFailRun = run?.relatedRunId
    ? testRuns.find((r) => r.id === run.relatedRunId)
    : null;

  const handleRerun = () => {
    if (run?.guardrailPatch && !patchApplied) return;
    if (run?.relatedRunId) {
      // Already a rerun — navigate back to the fail run
      setRerunning(true);
      setTimeout(() => {
        setRerunning(false);
        navigate(`/test-runs/${run.relatedRunId}`);
      }, 800);
      return;
    }
    // Fail run with a rerun target — navigate to the pass run
    const passRun = testRuns.find(
      (r) => r.relatedRunId === run?.id && r.verdict === "pass"
    );
    if (passRun) {
      setRerunning(true);
      setTimeout(() => {
        setRerunning(false);
        navigate(`/test-runs/${passRun.id}`);
      }, 1200);
    } else {
      // Fallback for runs without a linked rerun
      setRerunning(true);
      setTimeout(() => {
        setRerunning(false);
        navigate("/test-runs");
      }, 1500);
    }
  };

  if (!run || !scenario) {
    return (
      <div className="text-center py-16">
        <p className="text-lg font-medium text-gray-900 mb-2">Run not found</p>
        <p className="text-sm text-gray-500 mb-4">
          No test run matches ID "{id}"
        </p>
        <button
          onClick={() => navigate("/test-runs")}
          className="text-accent-blue text-sm font-medium hover:underline cursor-pointer"
        >
          ← Back to Test Runs
        </button>
      </div>
    );
  }

  const violationCount = run.violations.length;
  const isRerun = !!run.relatedRunId;

  // ─── Comparison data ────────────────────────────────────────────────────
  const comparisonData =
    relatedFailRun && isRerun
      ? {
          failRun: relatedFailRun,
          pairs: [
            {
              customer: run.utterances[0]?.text,
              fail: relatedFailRun.utterances[1]?.text,
              pass: run.utterances[1]?.text,
            },
          ],
        }
      : null;

  return (
    <div>
      {/* Back Link */}
      <button
        onClick={() => navigate("/test-runs")}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 cursor-pointer transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Test Runs
      </button>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">
            {scenario.title}
          </h1>
          {isRerun && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 uppercase tracking-wide">
              Rerun
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-1">
          {isRerun ? "Rerun" : "Run"} on {formatDate(run.date)} —{" "}
          {run.duration}
        </p>
      </div>

      {/* Metadata Bar */}
      <div className="flex flex-wrap items-center gap-4 mb-8 p-4 bg-card rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Verdict:</span>
          <StatusBadge verdict={run.verdict} size="md" />
        </div>
        <div className="w-px h-5 bg-gray-200" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Category:</span>
          <span className="text-sm font-medium text-gray-700">
            {scenario.riskCategory}
          </span>
        </div>
        <div className="w-px h-5 bg-gray-200" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Utterances:</span>
          <span className="text-sm font-medium text-gray-700">
            {run.utterances.length}
          </span>
        </div>
        {run.riskScore !== undefined && (
          <>
            <div className="w-px h-5 bg-gray-200" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Risk Score:</span>
              <span
                className={cn(
                  "text-sm font-semibold",
                  run.riskScore >= 70
                    ? "text-accent-red"
                    : run.riskScore >= 40
                    ? "text-accent-amber"
                    : "text-accent-green"
                )}
              >
                {run.riskScore}
              </span>
            </div>
          </>
        )}
        {run.severity && (
          <>
            <div className="w-px h-5 bg-gray-200" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Severity:</span>
              <span className="text-sm font-medium text-gray-700">
                {run.severity}
              </span>
            </div>
          </>
        )}
        {violationCount > 0 && (
          <>
            <div className="w-px h-5 bg-gray-200" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Violations:</span>
              <span
                className={cn(
                  "text-sm font-medium",
                  violationCount > 0 ? "text-accent-red" : "text-gray-700"
                )}
              >
                {violationCount}
              </span>
            </div>
          </>
        )}
      </div>

      {/* ── Evidence & Analysis Section (for runs with risk data) ──────── */}
      {run.riskScore !== undefined && run.recommendedAction && (
        <div className="bg-card rounded-xl border border-gray-100 shadow-sm p-6 mb-8">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-gray-400" />
            Evidence & Analysis
          </h2>
          <div className="space-y-4">
            {/* Transcript Evidence */}
            <div className="p-4 rounded-lg bg-red-50 border border-red-100">
              <div className="flex items-start gap-3">
                <FileText className="w-4 h-4 text-accent-red mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">
                    Transcript Evidence
                  </h3>
                  <p className="text-sm text-gray-700 italic">
                    "I can arrange a full refund to your original payment
                    method."
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Agent utterance at line 2 — directly promised a cash refund
                    for a non-refundable fare.
                  </p>
                </div>
              </div>
            </div>

            {/* Policy Evidence */}
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-100">
              <div className="flex items-start gap-3">
                <Info className="w-4 h-4 text-accent-amber mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">
                    Policy Evidence
                  </h3>
                  <p className="text-sm text-gray-700">
                    "Non-refundable fares are not eligible for cash refunds
                    after 24 hours."
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Violated rule #2 of the SkyPath Refund & Cancellation Policy
                  </p>
                </div>
              </div>
            </div>

            {/* Recommended Action */}
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">
                    Recommended Action
                  </h3>
                  <p className="text-sm text-gray-700">
                    {run.recommendedAction}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Guardrail Patch Section (for fail runs with a patch) ──────── */}
      {run.guardrailPatch && (
        <div className="bg-card rounded-xl border border-gray-100 shadow-sm p-6 mb-8">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Suggested Guardrail Patch
          </h2>
          <div
            className={cn(
              "p-4 rounded-lg border mb-4 font-mono text-sm leading-relaxed",
              patchApplied
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-gray-50 border-gray-200 text-gray-700"
            )}
          >
            {run.guardrailPatch.content}
          </div>
          <div className="flex items-center gap-4">
            {!patchApplied ? (
              <button
                onClick={() => setPatchApplied(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 transition-all duration-150 shadow-sm cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Apply Patch
              </button>
            ) : (
              <div className="flex items-center gap-3 text-sm text-green-700">
                <CheckCircle2 className="w-4 h-4" />
                <span className="font-medium">Patch applied to guardrails</span>
              </div>
            )}
            {patchApplied && (
              <button
                onClick={handleRerun}
                disabled={rerunning}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer",
                  rerunning
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-accent-blue text-white hover:bg-blue-600 shadow-sm"
                )}
              >
                {rerunning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Rerunning...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    Rerun This Scenario
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Before / After Comparison (for reruns) ────────────────────── */}
      {comparisonData && (
        <div className="bg-card rounded-xl border border-gray-100 shadow-sm p-6 mb-8">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-accent-green" />
            Before vs After — Guardrail Patch Impact
          </h2>

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-red-50 border border-red-100">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-4 h-4 text-accent-red" />
                <span className="text-sm font-semibold text-red-800">
                  Before Patch
                </span>
                <StatusBadge verdict="fail" size="sm" />
              </div>
              <p className="text-xs text-gray-500">
                Risk score:{" "}
                <span className="font-semibold text-accent-red">
                  {comparisonData.failRun.riskScore ?? "N/A"}
                </span>
              </p>
              <p className="text-xs text-gray-500">
                Agent:{" "}
                <span className="italic">
                  "I can arrange a full refund to your original payment method."
                </span>
              </p>
            </div>
            <div className="p-4 rounded-lg bg-green-50 border border-green-100">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-accent-green" />
                <span className="text-sm font-semibold text-green-800">
                  After Patch
                </span>
                <StatusBadge verdict="pass" size="sm" />
              </div>
              <p className="text-xs text-gray-500">
                Risk score:{" "}
                <span className="font-semibold text-accent-green">
                  {run.riskScore}
                </span>
              </p>
              <p className="text-xs text-gray-500">
                Agent:{" "}
                <span className="italic">
                  "I can't promise a cash refund for this fare because it is
                  outside the 24-hour refund window."
                </span>
              </p>
            </div>
          </div>

          {/* Side-by-side comparison rows */}
          <div className="space-y-3">
            {comparisonData.pairs.map((pair, idx) => (
              <div key={idx}>
                <p className="text-xs text-gray-400 mb-2 font-medium">
                  Customer says:
                </p>
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 mb-3">
                  <p className="text-sm text-gray-700 italic">{pair.customer}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-red-50 border border-red-100">
                    <div className="flex items-center gap-1.5 mb-1">
                      <XCircle className="w-3.5 h-3.5 text-accent-red" />
                      <span className="text-xs font-semibold text-red-700">
                        Before (Fail)
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{pair.fail}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-50 border border-green-100">
                    <div className="flex items-center gap-1.5 mb-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-accent-green" />
                      <span className="text-xs font-semibold text-green-700">
                        After (Pass)
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{pair.pass}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Conversation Transcript ───────────────────────────────────── */}
      <div className="bg-card rounded-xl border border-gray-100 shadow-sm mb-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            Conversation Transcript
          </h2>
          {violationCount > 0 && (
            <button
              onClick={() => setShowAllRationales(!showAllRationales)}
              className="text-xs font-medium text-accent-blue hover:underline cursor-pointer"
            >
              {showAllRationales ? "Hide rationales" : "Show all rationales"}
            </button>
          )}
        </div>
        <div className="px-6 py-5 space-y-4 max-h-[600px] overflow-y-auto">
          {run.utterances.map((utt) => {
            const isAgent = utt.speaker === "agent";
            const policy = utt.policyId
              ? policies.find((p) => p.id === utt.policyId)
              : null;

            return (
              <div
                key={utt.id}
                className={cn(
                  "flex",
                  isAgent ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[75%] rounded-xl px-4 py-3",
                    isAgent
                      ? "bg-white border border-gray-200"
                      : "bg-gray-50 border border-gray-100"
                  )}
                >
                  {/* Speaker Label */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                      {utt.speaker}
                    </span>
                    {isAgent && (
                      <StatusBadge verdict={utt.verdict} size="sm" />
                    )}
                  </div>

                  {/* Text */}
                  <p className="text-sm text-gray-800 leading-relaxed">
                    {utt.text}
                  </p>

                  {/* Rationale (for agent utterances with flag/fail) */}
                  {(utt.verdict === "flag" || utt.verdict === "fail") &&
                    isAgent && (
                      <div
                        className={cn(
                          "mt-2 text-xs text-gray-500 flex gap-1.5",
                          showAllRationales ? "" : "hidden"
                        )}
                      >
                        <Info className="w-3 h-3 mt-0.5 flex-shrink-0 text-gray-400" />
                        <span>{utt.rationale}</span>
                      </div>
                    )}

                  {/* Policy reference */}
                  {policy && (
                    <div className="mt-1.5 flex items-center gap-1">
                      <ExternalLink className="w-3 h-3 text-gray-400" />
                      <span className="text-[10px] text-gray-400">
                        Ref: {policy.title}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Violations Summary ────────────────────────────────────────── */}
      {violationCount > 0 && (
        <div className="bg-card rounded-xl border border-gray-100 shadow-sm p-6 mb-8">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Violations ({violationCount})
          </h2>
          <div className="space-y-3">
            {run.violations.map((v, idx) => {
              const pol = policies.find((p) => p.id === v.policyId);
              return (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-100"
                >
                  <StatusBadge verdict={v.verdict} size="sm" />
                  <div>
                    <p className="text-sm text-gray-800">{v.rationale}</p>
                    {pol && (
                      <p className="text-xs text-gray-500 mt-1">
                        Policy: {pol.title}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Actions ───────────────────────────────────────────────────── */}
      {/* Only show the fallback rerun button if there's no guardrailPatch
          (which has its own patch → rerun flow) or no relatedRunId */}
      {!run.guardrailPatch && !isRerun && (
        <div className="flex items-center gap-4">
          <button
            onClick={handleRerun}
            disabled={rerunning}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer",
              rerunning
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-accent-blue text-white hover:bg-blue-600 shadow-sm"
            )}
          >
            {rerunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Rerunning...
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                Rerun with Updated Guardrails
              </>
            )}
          </button>
        </div>
      )}

      {/* Rerun → back-to-fail button for rerun pages */}
      {isRerun && relatedFailRun && (
        <div className="flex items-center gap-4">
          <button
            onClick={handleRerun}
            disabled={rerunning}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer",
              rerunning
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-accent-blue text-white hover:bg-blue-600 shadow-sm"
            )}
          >
            {rerunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <ArrowLeft className="w-4 h-4" />
                View Original Failed Run
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}