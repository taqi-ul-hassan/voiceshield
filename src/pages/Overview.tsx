import { AlertTriangle, BarChart3, TrendingUp, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import KPICard from "../components/KPICard";
import StatusBadge from "../components/StatusBadge";
import { useStoredRuns } from "../features/voice-audit/storage";
import type { AgentRole } from "../features/voice-audit/types";
import { formatDate, shortId } from "../lib/utils";

const roleLabels: Record<AgentRole, string> = {
  airline: "Airline Support",
  hospital: "Hospital Services",
  police: "Police Department",
  custom: "Custom Agent",
};

export default function Overview() {
  const navigate = useNavigate();
  const runs = useStoredRuns();
  const passRate = rate(runs.filter((run) => run.verdict === "pass").length, runs.length);
  const flagRate = rate(runs.filter((run) => run.verdict === "flag").length, runs.length);
  const failRate = rate(runs.filter((run) => run.verdict === "fail").length, runs.length);
  const recentRuns = runs.slice(0, 5);

  return (
    <div className="space-y-8">
      <header className="mb-2">
        <h1 className="text-3xl font-bold text-app-fg tracking-tight">Overview</h1>
        <p className="text-base text-app-muted mt-2">How your voice agents are holding up against the EU AI Act</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
        <KPICard title="Total Tests" value={runs.length} icon={BarChart3} accentColor="text-ab" accentBg="bg-ab-soft" />
        <KPICard title="Pass Rate" value={`${passRate}%`} trend={passRate >= 50 ? "up" : "down"} trendValue={`${passRate}% overall`} icon={TrendingUp} accentColor="text-pass-text" accentBg="bg-pass-soft" />
        <KPICard title="Flag Rate" value={`${flagRate}%`} trend={flagRate > 20 ? "up" : "neutral"} trendValue={`${flagRate}% flagged`} icon={AlertTriangle} accentColor="text-flag-text" accentBg="bg-flag-soft" subtitle="Needs review" />
        <KPICard title="Fail Rate" value={`${failRate}%`} trend={failRate > 20 ? "down" : "up"} trendValue={`${failRate}% failed`} icon={XCircle} accentColor="text-fail-text" accentBg="bg-fail-soft" subtitle="Needs attention" />
      </div>

      {runs.length === 0 ? (
        <section className="bg-app-card rounded-2xl border border-app-border shadow-sm p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-app-soft2 flex items-center justify-center mx-auto mb-5">
            <BarChart3 className="w-8 h-8 text-app-muted/70" />
          </div>
          <h2 className="text-lg font-semibold text-app-fg">No test runs yet</h2>
          <p className="text-sm text-app-muted mt-2 max-w-sm mx-auto leading-relaxed">
            Your dashboard will come to life here once you've run your first conversation.
            Head to the Test Bench to stress-test an agent with an adversarial caller.
          </p>
          <button
            type="button"
            onClick={() => navigate("/test-bench")}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-ab text-ab-fg text-sm font-medium hover:opacity-90 active:scale-[0.97] transition-all duration-150 cursor-pointer shadow-sm"
          >
            Open the Test Bench
          </button>
        </section>
      ) : (
        <>
          <section className="bg-app-card rounded-2xl border border-app-border shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-app-fg">Risk distribution</h2>
              <button type="button" onClick={() => navigate("/risk-report")} className="text-xs font-medium text-ab hover:underline cursor-pointer">View report</button>
            </div>
            <div className="space-y-4">
              {[
                { label: "Pass", value: passRate, color: "bg-pass-text" },
                { label: "Flag", value: flagRate, color: "bg-flag-text" },
                { label: "Fail", value: failRate, color: "bg-fail-text" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="w-10 text-xs text-app-muted">{item.label}</span>
                  <div className="flex-1 h-3 bg-app-soft rounded-full overflow-hidden"><div className={`h-full ${item.color}`} style={{ width: `${item.value}%` }} /></div>
                  <span className="w-10 text-right text-xs font-medium text-app-muted">{item.value}%</span>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-app-card rounded-2xl border border-app-border shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-app-border">
              <h2 className="text-base font-semibold text-app-fg">Recent Test Runs</h2>
              <button type="button" onClick={() => navigate("/test-runs")} className="text-xs font-medium text-ab hover:underline cursor-pointer">View all</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-app-border"><th className={th}>Run ID</th><th className={th}>Agent</th><th className={th}>Persona</th><th className={th}>Date</th><th className={th}>Verdict</th></tr></thead>
                <tbody>
                  {recentRuns.map((run) => (
                    <tr key={run.id} onClick={() => navigate(`/test-runs/${run.id}`)} className="border-b border-app-border hover:bg-app-soft cursor-pointer transition-colors duration-150">
                      <td className="px-6 py-3.5 text-xs font-mono text-app-muted">{shortId(run.id)}</td>
                      <td className="px-6 py-3.5 text-sm text-app-fg">{roleLabels[run.agentConfig.role]}</td>
                      <td className="px-6 py-3.5 text-sm text-app-muted capitalize">{run.persona}</td>
                      <td className="px-6 py-3.5 text-sm text-app-muted">{formatDate(run.date)}</td>
                      <td className="px-6 py-3.5"><StatusBadge verdict={run.verdict} size="sm" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function rate(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 100);
}

const th = "text-left px-6 py-3 text-xs font-medium text-app-muted uppercase tracking-wider";
