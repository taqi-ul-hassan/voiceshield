import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Loader2, Bot, BookOpen, User, Settings2, ChevronDown } from "lucide-react";
import { scenarios, policies } from "../data/demo";
import { addTestRun, updateTestRun } from "../store/testRuns";
import ScenarioCard from "../components/ScenarioCard";
import { cn } from "../lib/utils";
import type { TestRun, Verdict } from "../types";

// ── The 5 seed scenarios ───────────────────────────────────────────────────────
const SEED_IDS = [
  "sc-refund-deadline",
  "sc-unauthorized-comp",
  "sc-false-promise",
  "sc-chargeback",
  "sc-escalation-req",
];

const seedScenarios = scenarios.filter((s) => SEED_IDS.includes(s.id));

const agents = [
  { id: "skypath-support", name: "SkyPath Support Agent", version: "v2.1.0" },
  { id: "skypath-support-v1", name: "SkyPath Support Agent", version: "v1.8.3" },
  { id: "third-party-ai", name: "Third-Party Voice AI", version: "v3.0.1" },
];

const personas = [
  "Frustrated Traveler",
  "Demanding Customer",
  "Aggressive Caller",
  "Confused Passenger",
  "Frequent Flyer",
];

const policySets = policies.map((p) => ({
  id: p.id,
  name: p.title,
}));

const agentVersions = ["v2.1.0", "v2.0.5", "v1.9.2", "v1.8.3"];

// ── Simulated progress stages ──────────────────────────────────────────────────
const STAGES = [
  { label: "Initialising test environment", duration: 600 },
  { label: "Running scenario simulation", duration: 800 },
  { label: "Analysing agent utterances", duration: 700 },
  { label: "Checking policy compliance", duration: 900 },
  { label: "Generating compliance report", duration: 500 },
];

// ── Generate a mock run result ─────────────────────────────────────────────────
function pickMockVerdict(): { verdict: Verdict; riskScore: number; severity: string } {
  const outcomes: Array<{ verdict: Verdict; riskScore: number; severity: string }> = [
    { verdict: "pass", riskScore: 12, severity: "Low" },
    { verdict: "pass", riskScore: 18, severity: "Low" },
    { verdict: "flag", riskScore: 45, severity: "Medium" },
    { verdict: "fail", riskScore: 78, severity: "High" },
    { verdict: "fail", riskScore: 92, severity: "Critical" },
  ];
  return outcomes[Math.floor(Math.random() * outcomes.length)];
}

export default function TestBench() {
  const navigate = useNavigate();

  // Configuration state
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState(agents[0].id);
  const [selectedPolicy, setSelectedPolicy] = useState(policies[0].id);
  const [selectedPersona, setSelectedPersona] = useState(personas[0]);
  const [selectedVersion, setSelectedVersion] = useState(agentVersions[0]);

  // Running state
  const [running, setRunning] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);

  const selectedScenario = seedScenarios.find((s) => s.id === selectedScenarioId);
  const selectedPolicyObj = policies.find((p) => p.id === selectedPolicy);

  const handleLaunch = useCallback(() => {
    if (!selectedScenarioId) return;

    setRunning(true);
    setCurrentStage(0);
    setProgress(0);

    // Create a new TestRun with running status
    const runId = "run-bench-" + Date.now().toString(36);
    const newRun: TestRun = {
      id: runId,
      scenarioId: selectedScenarioId,
      date: new Date().toISOString(),
      duration: "0s",
      verdict: "pass",
      status: "running",
      utterances: [],
      violations: [],
    };
    addTestRun(newRun);

    let stageIdx = 0;
    let totalProgress = 0;

    const runStage = () => {
      if (stageIdx >= STAGES.length) {
        // Simulation complete — update run and navigate
        const mockResult = pickMockVerdict();
        const sc = scenarios.find((s) => s.id === selectedScenarioId);

        const completedRun: TestRun = {
          id: runId,
          scenarioId: selectedScenarioId,
          date: new Date().toISOString(),
          duration: `${Math.floor(Math.random() * 4) + 1}m ${Math.floor(Math.random() * 60)}s`,
          verdict: mockResult.verdict,
          status: "completed",
          riskScore: mockResult.riskScore,
          severity: mockResult.severity,
          utterances: [
            {
              id: runId + "-utt-1",
              speaker: "customer",
              text: sc?.description?.split(".")[0] || "Customer initiated call.",
              verdict: "pass",
              rationale: "Opening statement from customer.",
            },
            {
              id: runId + "-utt-2",
              speaker: "agent",
              text: mockResult.verdict === "pass"
                ? "I understand your situation. Let me check what options are available for you."
                : "Unfortunately, our policy doesn't allow that. There's nothing I can do.",
              verdict: mockResult.verdict === "fail" ? "fail" : mockResult.verdict === "flag" ? "flag" : "pass",
              rationale: mockResult.verdict === "fail"
                ? "Agent failed to properly address the customer's concern."
                : "Agent handled the situation appropriately.",
            },
            {
              id: runId + "-utt-3",
              speaker: "customer",
              text: "This is very frustrating. I expected better service from SkyPath.",
              verdict: "pass",
              rationale: "Customer expressing dissatisfaction.",
            },
          ],
          violations: mockResult.verdict !== "pass"
            ? [
                {
                  utteranceId: runId + "-utt-2",
                  policyId: selectedPolicy,
                  verdict: mockResult.verdict,
                  rationale: mockResult.verdict === "fail"
                    ? "Agent response violated policy. Utterance did not comply with required policy guidelines."
                    : "Agent response partially aligned with policy but had minor deviations requiring attention.",
                },
              ]
            : [],
        };

        updateTestRun(runId, completedRun);

        // Small delay then navigate
        setTimeout(() => {
          setRunning(false);
          navigate(`/test-runs/${runId}`);
        }, 400);
        return;
      }

      const stage = STAGES[stageIdx];
      setCurrentStage(stageIdx);

      // Animate progress within this stage
      const stepMs = 50;
      const steps = Math.floor(stage.duration / stepMs);
      let step = 0;

      const tick = () => {
        step++;
        const stageFraction = step / steps;
        const totalStageDuration = STAGES.reduce((a, s) => a + s.duration, 0);
        const stagePct = (stage.duration / totalStageDuration) * 100;
        const startPct = (totalProgress / totalStageDuration) * 100;
        const currentPct = Math.min(100, startPct + stagePct * stageFraction);
        setProgress(Math.round(currentPct));

        if (step < steps) {
          setTimeout(tick, stepMs);
        } else {
          totalProgress += stage.duration;
          stageIdx++;
          setTimeout(runStage, 100);
        }
      };

      tick();
    };

    runStage();
  }, [selectedScenarioId, selectedPolicy, navigate]);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Test Bench</h1>
        <p className="text-sm text-gray-500 mt-1">
          Test what your voice agent says when customers push it hardest.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── Left: Selectors + Scenario Cards ────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Agent Selector */}
          <div className="bg-card rounded-xl border border-gray-100 shadow-sm p-5">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
              <Bot className="w-4 h-4 text-gray-400" />
              Voice Agent
            </label>
            <div className="relative">
              <select
                value={selectedAgent}
                onChange={(e) => {
                  setSelectedAgent(e.target.value);
                  const ag = agents.find((a) => a.id === e.target.value);
                  if (ag) setSelectedVersion(ag.version);
                }}
                className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 pr-10 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-accent-blue/40 focus:border-accent-blue cursor-pointer"
              >
                {agents.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.name} ({ag.version})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Policy Selector */}
          <div className="bg-card rounded-xl border border-gray-100 shadow-sm p-5">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
              <BookOpen className="w-4 h-4 text-gray-400" />
              Policy Set
            </label>
            <div className="relative">
              <select
                value={selectedPolicy}
                onChange={(e) => setSelectedPolicy(e.target.value)}
                className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 pr-10 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-accent-blue/40 focus:border-accent-blue cursor-pointer"
              >
                {policySets.map((ps) => (
                  <option key={ps.id} value={ps.id}>
                    {ps.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Scenario Cards */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              Test Scenarios
            </h2>
            <div className="space-y-3">
              {seedScenarios.map((scenario) => (
                <ScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                  selected={selectedScenarioId === scenario.id}
                  onSelect={() =>
                    setSelectedScenarioId(
                      selectedScenarioId === scenario.id ? null : scenario.id
                    )
                  }
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: Test Configuration Panel ─────────────────────────────── */}
        <div className="w-full lg:w-80 flex-shrink-0">
          <div className="bg-card rounded-xl border border-gray-100 shadow-sm p-5 sticky top-8">
            <h2 className="text-sm font-semibold text-gray-900 mb-5 flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-gray-400" />
              Test Configuration
            </h2>

            <div className="space-y-4">
              {/* Selected Scenario */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1.5">
                  <User className="w-3 h-3" />
                  Selected Scenario
                </label>
                <div className="text-sm text-gray-800 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 min-h-[2.5rem]">
                  {selectedScenario ? (
                    <span>{selectedScenario.title}</span>
                  ) : (
                    <span className="text-gray-400 italic">
                      None selected
                    </span>
                  )}
                </div>
              </div>

              {/* Caller Persona */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1.5">
                  <User className="w-3 h-3" />
                  Caller Persona
                </label>
                <div className="relative">
                  <select
                    value={selectedPersona}
                    onChange={(e) => setSelectedPersona(e.target.value)}
                    className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-accent-blue/40 focus:border-accent-blue cursor-pointer"
                  >
                    {personas.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Policy Set */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1.5">
                  <BookOpen className="w-3 h-3" />
                  Policy Set
                </label>
                <div className="text-sm text-gray-800 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                  {selectedPolicyObj?.title || selectedPolicy}
                </div>
              </div>

              {/* Agent Version */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1.5">
                  <Settings2 className="w-3 h-3" />
                  Agent Version
                </label>
                <div className="relative">
                  <select
                    value={selectedVersion}
                    onChange={(e) => setSelectedVersion(e.target.value)}
                    className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-accent-blue/40 focus:border-accent-blue cursor-pointer"
                  >
                    {agentVersions.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="my-5 border-t border-gray-100" />

            {/* Launch Button */}
            <button
              onClick={handleLaunch}
              disabled={!selectedScenarioId || running}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-150",
                selectedScenarioId && !running
                  ? "bg-accent-blue text-white hover:bg-blue-600 shadow-md hover:shadow-lg cursor-pointer"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
            >
              {running ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Running Test...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Launch Test Run
                </>
              )}
            </button>

            {/* Running overlay (within the panel) */}
            {running && (
              <div className="mt-5 space-y-3">
                {/* Progress bar */}
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-accent-blue rounded-full transition-all duration-200 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 text-center">
                  {progress}% complete
                </p>
                {/* Stage indicator */}
                <div className="space-y-1.5">
                  {STAGES.map((stage, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "flex items-center gap-2 text-xs transition-colors duration-300",
                        idx < currentStage
                          ? "text-accent-green"
                          : idx === currentStage
                          ? "text-accent-blue font-medium"
                          : "text-gray-300"
                      )}
                    >
                      <div
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          idx < currentStage
                            ? "bg-accent-green"
                            : idx === currentStage
                            ? "bg-accent-blue animate-pulse"
                            : "bg-gray-200"
                        )}
                      />
                      {stage.label}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}