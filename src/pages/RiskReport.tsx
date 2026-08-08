import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useStoredRuns } from "../features/voice-audit/storage";
import type { AgentRole } from "../features/voice-audit/types";

const roleLabels: Record<AgentRole, string> = {
  airline: "Airline Support",
  hospital: "Hospital Services",
  police: "Police Department",
  custom: "Custom Agent",
};

export default function RiskReport() {
  const navigate = useNavigate();
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
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-app-fg tracking-tight">Risk Report</h1>
        <p className="text-base text-app-muted mt-2">Compliance posture across all test runs</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SummaryCard label="Total tests" value={runs.length} color="text-app-fg" />
        <SummaryCard label="Pass rate" value={`${rate(passCount, runs.length)}%`} color="text-pass-text" />
        <SummaryCard label="Flag rate" value={`${rate(flagCount, runs.length)}%`} color="text-flag-text" />
        <SummaryCard label="Fail rate" value={`${rate(failCount, runs.length)}%`} color="text-fail-text" />
      </div>

      {runs.length === 0 ? (
        <div className="bg-app-card rounded-2xl border border-app-border shadow-sm p-14 text-center">
          <h2 className="text-lg font-semibold text-app-fg">No runs to report on yet</h2>
          <p className="text-sm text-app-muted mt-2 max-w-sm mx-auto leading-relaxed">
            Run a conversation in the Test Bench and this report will break down risk by
            agent role and the EU AI Act articles that need attention.
          </p>
          <button type="button" onClick={() => navigate("/test-bench")} className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-ab text-ab-fg text-sm font-medium hover:opacity-90 active:scale-[0.97] transition-all duration-150 cursor-pointer shadow-sm">
            Open the Test Bench
          </button>
        </div>
      ) : (
        <>
          <section className="bg-app-card rounded-2xl border border-app-border shadow-sm mb-6">
            <div className="px-6 py-4 border-b border-app-border"><h2 className="text-base font-semibold text-app-fg">Risk by agent role</h2></div>
            <div className="px-6 py-5 space-y-5">
              {roleBreakdown.map(([role, data]) => (
                <div key={role}>
                  <div className="flex items-center justify-between mb-2"><div><span className="text-sm font-medium text-app-fg">{roleLabels[role]}</span><span className="text-xs text-app-muted ml-2">{data.total} test{data.total === 1 ? "" : "s"}</span></div><span className="text-xs text-app-muted">{rate(data.pass, data.total)}% pass</span></div>
                  <div className="h-2.5 bg-app-soft rounded-full overflow-hidden flex" aria-hidden="true"><div className="bg-pass-text" style={{ width: `${rate(data.pass, data.total)}%` }} /><div className="bg-flag-text" style={{ width: `${rate(data.flag, data.total)}%` }} /><div className="bg-fail-text" style={{ width: `${rate(data.fail, data.total)}%` }} /></div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-app-card rounded-2xl border border-app-border shadow-sm p-6">
            <h2 className="text-base font-semibold text-app-fg mb-4">Most flagged EU AI Act articles</h2>
            {articleCounts.length === 0 ? <p className="text-sm text-app-muted">No findings recorded — that's a good sign.</p> : <div className="space-y-3">{articleCounts.map(([article, count]) => <div key={article} className="flex items-center justify-between rounded-lg bg-fail-soft border border-fail-text/25 px-4 py-3"><span className="text-sm text-app-fg">{article}</span><span className="text-sm font-semibold text-fail-text">{count} finding{count === 1 ? "" : "s"}</span></div>)}</div>}
          </section>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return <div className="bg-app-card rounded-xl border border-app-border shadow-sm p-5"><p className="text-xs font-medium text-app-muted uppercase tracking-wider">{label}</p><p className={`text-2xl font-bold mt-2 ${color}`}>{value}</p></div>;
}

function rate(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 100);
}
