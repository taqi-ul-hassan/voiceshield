import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { riskReport, testRuns, scenarios } from "../data/demo";
import { formatDate, shortId } from "../lib/utils";
import KPICard from "../components/KPICard";
import StatusBadge from "../components/StatusBadge";

export default function Overview() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Simulate brief loading state on mount
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6" aria-label="Loading overview">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="h-4 w-72 bg-gray-100 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-gray-100 rounded-xl" />
        <div className="h-48 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  const report = riskReport;
  const categoriesAtRisk = report.categoryBreakdown.filter(
    (c) => c.passRate < 70
  ).length;

  // Get scenario name by ID
  const getScenarioName = (scenarioId: string) =>
    scenarios.find((s) => s.id === scenarioId)?.title ?? "Unknown Scenario";

  // Recent 5 runs sorted by date descending
  const recentRuns = [...testRuns]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <p className="text-sm text-gray-500 mt-1">
          Meridian Financial — Compliance Guardrail Performance
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard
          title="Total Tests"
          value={report.totalTests}
          icon={BarChart3}
          accentColor="text-accent-blue"
          accentBg="bg-blue-50"
        />
        <KPICard
          title="Pass Rate"
          value={`${report.passRate}%`}
          trend={report.passRate >= 50 ? "up" : "down"}
          trendValue={`${report.passRate}% overall`}
          icon={TrendingUp}
          accentColor="text-accent-green"
          accentBg="bg-green-50"
          subtitle={`${report.passRate} of ${report.totalTests} tests`}
        />
        <KPICard
          title="Flag Rate"
          value={`${report.flagRate}%`}
          trend={report.flagRate > 20 ? "up" : "neutral"}
          trendValue={`${report.flagRate}% flagged`}
          icon={AlertTriangle}
          accentColor="text-accent-amber"
          accentBg="bg-amber-50"
          subtitle="Needs review"
        />
        <KPICard
          title="Fail Rate"
          value={`${report.failRate}%`}
          trend={report.failRate > 20 ? "down" : "up"}
          trendValue={`${report.failRate}% failed`}
          icon={XCircle}
          accentColor="text-accent-red"
          accentBg="bg-red-50"
          subtitle="Requires attention"
        />
      </div>

      {/* Categories at Risk mini card */}
      {categoriesAtRisk > 0 && (
        <div className="flex items-center gap-2 mb-6 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-accent-amber flex-shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">{categoriesAtRisk}</span>{" "}
            {categoriesAtRisk === 1 ? "category" : "categories"} at risk (pass
            rate below 70%) — review the{" "}
            <button
              onClick={() => navigate("/risk-report")}
              className="text-accent-blue underline hover:no-underline font-medium cursor-pointer"
            >
              Risk Report
            </button>{" "}
            for details.
          </p>
        </div>
      )}

      {/* Risk Trend Chart */}
      <div className="bg-card rounded-xl border border-gray-100 shadow-sm p-6 mb-8">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          Risk Trend — Last {report.riskTrend.length} Runs
        </h2>
        <div className="space-y-2.5">
          {report.riskTrend.map((point) => (
            <div key={point.date} className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-12 flex-shrink-0">
                {point.date}
              </span>
              <div className="flex-1 h-6 rounded-md overflow-hidden flex">
                <div
                  className="h-full bg-accent-green transition-all duration-300"
                  style={{ width: `${point.passRate}%` }}
                  title={`Pass: ${point.passRate}%`}
                />
                <div
                  className="h-full bg-accent-amber transition-all duration-300"
                  style={{ width: `${point.flagRate}%` }}
                  title={`Flag: ${point.flagRate}%`}
                />
                <div
                  className="h-full bg-accent-red transition-all duration-300"
                  style={{ width: `${point.failRate}%` }}
                  title={`Fail: ${point.failRate}%`}
                />
              </div>
              <div className="flex items-center gap-2 w-20 flex-shrink-0 justify-end">
                {point.failRate > 0 && (
                  <span className="text-[10px] font-medium text-accent-red">
                    {point.failRate}%
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100">
          {[
            { color: "bg-accent-green", label: "Pass" },
            { color: "bg-accent-amber", label: "Flag" },
            { color: "bg-accent-red", label: "Fail" },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded ${l.color}`} />
              <span className="text-xs text-gray-500">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Test Runs */}
      <div className="bg-card rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            Recent Test Runs
          </h2>
          <button
            onClick={() => navigate("/test-runs")}
            className="text-xs font-medium text-accent-blue hover:underline cursor-pointer"
          >
            View All →
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Recent test runs with scenario, date, verdict, and duration
            </caption>
            <thead>
              <tr className="border-b border-gray-50">
                <th
                  scope="col"
                  className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider"
                >
                  Run ID
                </th>
                <th
                  scope="col"
                  className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider"
                >
                  Scenario
                </th>
                <th
                  scope="col"
                  className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider"
                >
                  Date
                </th>
                <th
                  scope="col"
                  className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider"
                >
                  Verdict
                </th>
                <th
                  scope="col"
                  className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider"
                >
                  Duration
                </th>
              </tr>
            </thead>
            <tbody>
              {recentRuns.map((run) => (
                <tr
                  key={run.id}
                  onClick={() => navigate(`/test-runs/${run.id}`)}
                  className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") navigate(`/test-runs/${run.id}`);
                  }}
                  role="link"
                  aria-label={`View test run ${shortId(run.id)}: ${getScenarioName(run.scenarioId)}`}
                >
                  <td className="px-6 py-3.5 text-xs font-mono text-gray-500">
                    {shortId(run.id)}
                  </td>
                  <td className="px-6 py-3.5 text-sm text-gray-900 max-w-[200px] truncate">
                    {getScenarioName(run.scenarioId)}
                  </td>
                  <td className="px-6 py-3.5 text-sm text-gray-500">
                    {formatDate(run.date)}
                  </td>
                  <td className="px-6 py-3.5">
                    <StatusBadge verdict={run.verdict} size="sm" />
                  </td>
                  <td className="px-6 py-3.5 text-sm text-gray-500">
                    {run.duration}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {recentRuns.length === 0 && (
          <div className="px-6 py-10 text-center text-sm text-gray-400">
            No test runs yet. Go to the{" "}
            <button
              onClick={() => navigate("/test-bench")}
              className="text-accent-blue underline cursor-pointer"
            >
              Test Bench
            </button>{" "}
            to run your first scenario.
          </div>
        )}
      </div>
    </div>
  );
}