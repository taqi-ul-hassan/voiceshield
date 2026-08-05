import { useMemo } from "react";
import { useStoredRuns } from "../features/voice-audit/storage";
import type { AgentRole } from "../features/voice-audit/types";

const roleLabels: Record<AgentRole, string> = {
  airline: "Airline Support",
  hospital: "Hospital Services",
  police: "Police Department",
  custom: "Custom Agent",
};

export default function RiskReport() {
  const runs = useStoredRuns();
  const passCount = runs.filter((run) => run.verdict === "pass").length;
  const flagCount = runs.filter((run) => run.verdict === "flag").length;
  const failCount = runs.filter((run) => run.verdict === "fail").length;
  const articleCounts = useMemo(() => {
    const counts = new Map<string, number>();
    runs.flatMap((run) => run.violations).forEach((violation) => counts.set(violation.articleReference, (counts.get(violation.articleReference) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [runs]);
  const roleBreakdown = useMemo(() => {
    const roles = new Map<AgentRole, { total: number; pass: number; flag: number; fail: number }>();
    runs.forEach((run) => {
      const current = roles.get(run.agentConfig.role) ?? { total: 0, pass: 0, flag: 0, fail: 0 };
      current.total += 1;
      current[run.verdict] += 1;
      roles.set(run.agentConfig.role, current);
    });
    return [...roles.entries()];
  }, [runs]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Risk Report</h1>
        <p className="text-sm text-gray-500 mt-1">Aggregated analysis across completed browser test runs</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SummaryCard label="Total tests" value={runs.length} color="text-gray-900" />
        <SummaryCard label="Pass rate" value={`${rate(passCount, runs.length)}%`} color="text-accent-green" />
        <SummaryCard label="Flag rate" value={`${rate(flagCount, runs.length)}%`} color="text-accent-amber" />
        <SummaryCard label="Fail rate" value={`${rate(failCount, runs.length)}%`} color="text-accent-red" />
      </div>

      {runs.length === 0 ? (
        <div className="bg-card rounded-xl border border-gray-100 p-12 text-center text-sm text-gray-500">Run an evaluation to generate a risk report.</div>
      ) : (
        <>
          <section className="bg-card rounded-xl border border-gray-100 shadow-sm mb-6">
            <div className="px-6 py-4 border-b border-gray-100"><h2 className="text-base font-semibold text-gray-900">Risk by agent role</h2></div>
            <div className="px-6 py-5 space-y-5">
              {roleBreakdown.map(([role, data]) => (
                <div key={role}>
                  <div className="flex items-center justify-between mb-2"><div><span className="text-sm font-medium text-gray-900">{roleLabels[role]}</span><span className="text-xs text-gray-400 ml-2">{data.total} test{data.total === 1 ? "" : "s"}</span></div><span className="text-xs text-gray-500">{rate(data.pass, data.total)}% pass</span></div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex"><div className="bg-accent-green" style={{ width: `${rate(data.pass, data.total)}%` }} /><div className="bg-accent-amber" style={{ width: `${rate(data.flag, data.total)}%` }} /><div className="bg-accent-red" style={{ width: `${rate(data.fail, data.total)}%` }} /></div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-card rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Most flagged EU AI Act articles</h2>
            {articleCounts.length === 0 ? <p className="text-sm text-gray-400">No findings recorded.</p> : <div className="space-y-3">{articleCounts.map(([article, count]) => <div key={article} className="flex items-center justify-between rounded-lg bg-red-50 border border-red-100 px-4 py-3"><span className="text-sm text-gray-800">{article}</span><span className="text-sm font-semibold text-accent-red">{count} finding{count === 1 ? "" : "s"}</span></div>)}</div>}
          </section>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return <div className="bg-card rounded-xl border border-gray-100 shadow-sm p-5"><p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</p><p className={`text-2xl font-bold mt-2 ${color}`}>{value}</p></div>;
}

function rate(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 100);
}
