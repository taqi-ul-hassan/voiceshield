import { useNavigate } from "react-router-dom";
import { AlertTriangle, BarChart3, TrendingUp, XCircle } from "lucide-react";
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
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Overview</h1>
        <p className="text-base text-slate-500 mt-2">EU AI Act voice-agent compliance performance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard title="Total Tests" value={runs.length} icon={BarChart3} accentColor="text-accent-blue" accentBg="bg-blue-50" />
        <KPICard title="Pass Rate" value={`${passRate}%`} trend={passRate >= 50 ? "up" : "down"} trendValue={`${passRate}% overall`} icon={TrendingUp} accentColor="text-accent-green" accentBg="bg-green-50" />
        <KPICard title="Flag Rate" value={`${flagRate}%`} trend={flagRate > 20 ? "up" : "neutral"} trendValue={`${flagRate}% flagged`} icon={AlertTriangle} accentColor="text-accent-amber" accentBg="bg-amber-50" subtitle="Needs review" />
        <KPICard title="Fail Rate" value={`${failRate}%`} trend={failRate > 20 ? "down" : "up"} trendValue={`${failRate}% failed`} icon={XCircle} accentColor="text-accent-red" accentBg="bg-red-50" subtitle="Requires attention" />
      </div>

      {runs.length === 0 ? (
        <section className="bg-card rounded-2xl border border-slate-100 shadow-sm p-10 text-center">
          <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-gray-900">No live test runs yet</h2>
          <p className="text-sm text-gray-500 mt-1 mb-5">Launch a conversation in the Test Bench to populate this dashboard.</p>
          <button type="button" onClick={() => navigate("/test-bench")} className="px-4 py-2 rounded-lg bg-accent-blue text-white text-sm font-medium hover:bg-blue-600">Open Test Bench</button>
        </section>
      ) : (
        <>
          <section className="bg-card rounded-2xl border border-slate-100 shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Risk distribution</h2>
              <button type="button" onClick={() => navigate("/risk-report")} className="text-xs font-medium text-accent-blue hover:underline">View report</button>
            </div>
            <div className="space-y-3">
              {[
                { label: "Pass", value: passRate, color: "bg-accent-green" },
                { label: "Flag", value: flagRate, color: "bg-accent-amber" },
                { label: "Fail", value: failRate, color: "bg-accent-red" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="w-10 text-xs text-gray-500">{item.label}</span>
                  <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full ${item.color}`} style={{ width: `${item.value}%` }} /></div>
                  <span className="w-10 text-right text-xs font-medium text-gray-600">{item.value}%</span>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-card rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Recent Test Runs</h2>
              <button type="button" onClick={() => navigate("/test-runs")} className="text-xs font-medium text-accent-blue hover:underline">View all</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-50"><th className={th}>Run ID</th><th className={th}>Agent</th><th className={th}>Persona</th><th className={th}>Date</th><th className={th}>Verdict</th></tr></thead>
                <tbody>
                  {recentRuns.map((run) => (
                    <tr key={run.id} onClick={() => navigate(`/test-runs/${run.id}`)} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer">
                      <td className="px-6 py-3.5 text-xs font-mono text-gray-500">{shortId(run.id)}</td>
                      <td className="px-6 py-3.5 text-sm text-gray-900">{roleLabels[run.agentConfig.role]}</td>
                      <td className="px-6 py-3.5 text-sm text-gray-500 capitalize">{run.persona}</td>
                      <td className="px-6 py-3.5 text-sm text-gray-500">{formatDate(run.date)}</td>
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

const th = "text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider";
