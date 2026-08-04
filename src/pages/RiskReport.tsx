import { ShieldAlert, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { riskReport, policies } from "../data/demo";

export default function RiskReport() {
  const { totalTests, passRate, flagRate, failRate, categoryBreakdown, mostFailedPolicies, riskTrend } = riskReport;

  const getPolicyTitle = (policyId: string) =>
    policies.find((p) => p.id === policyId)?.title ?? policyId;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Risk Report</h1>
        <p className="text-sm text-gray-500 mt-1">
          Aggregated risk analysis across all test runs
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-card rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Total Tests
            </span>
            <ShieldAlert className="w-4 h-4 text-gray-300" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalTests}</p>
        </div>

        <div className="bg-card rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Pass Rate
            </span>
            <CheckCircle2 className="w-4 h-4 text-accent-green" />
          </div>
          <p className="text-2xl font-bold text-accent-green">{passRate}%</p>
        </div>

        <div className="bg-card rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Flag Rate
            </span>
            <AlertTriangle className="w-4 h-4 text-accent-amber" />
          </div>
          <p className="text-2xl font-bold text-accent-amber">{flagRate}%</p>
        </div>

        <div className="bg-card rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Fail Rate
            </span>
            <XCircle className="w-4 h-4 text-accent-red" />
          </div>
          <p className="text-2xl font-bold text-accent-red">{failRate}%</p>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-card rounded-xl border border-gray-100 shadow-sm mb-8">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            Risk by Category
          </h2>
        </div>
        <div className="px-6 py-5">
          <div className="space-y-4">
            {categoryBreakdown.map((cat) => (
              <div key={cat.category}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {cat.category}
                    </span>
                    <span className="text-xs text-gray-400">
                      {cat.count} test{cat.count !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      cat.failRate >= 50
                        ? "text-accent-red"
                        : cat.flagRate >= 50
                        ? "text-accent-amber"
                        : "text-accent-green"
                    }`}
                  >
                    {cat.failRate > 0
                      ? `${cat.failRate}% fail`
                      : cat.flagRate > 0
                      ? `${cat.flagRate}% flag`
                      : `${cat.passRate}% pass`}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-accent-green transition-all"
                    style={{ width: `${cat.passRate}%` }}
                    title={`Pass: ${cat.passRate}%`}
                  />
                  <div
                    className="h-full bg-accent-amber transition-all"
                    style={{ width: `${cat.flagRate}%` }}
                    title={`Flag: ${cat.flagRate}%`}
                  />
                  <div
                    className="h-full bg-accent-red transition-all"
                    style={{ width: `${cat.failRate}%` }}
                    title={`Fail: ${cat.failRate}%`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Two-column layout: Most Failed Policies + Risk Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Most Failed Policies */}
        <div className="bg-card rounded-xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">
              Most Failed Policies
            </h2>
          </div>
          <div className="px-6 py-5">
            {mostFailedPolicies.length > 0 ? (
              <div className="space-y-3">
                {mostFailedPolicies.map((mp) => (
                  <div
                    key={mp.policyId}
                    className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-100"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <XCircle className="w-4 h-4 text-accent-red flex-shrink-0" />
                      <span className="text-sm text-gray-800 truncate">
                        {getPolicyTitle(mp.policyId)}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-accent-red flex-shrink-0 ml-3">
                      {mp.failCount} fail{mp.failCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">
                No failed policies — everything passed!
              </p>
            )}
          </div>
        </div>

        {/* Risk Trend */}
        <div className="bg-card rounded-xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">
              Risk Trend
            </h2>
          </div>
          <div className="px-6 py-5">
            <div className="space-y-0.5">
              {riskTrend.map((day) => (
                <div
                  key={day.date}
                  className="flex items-center gap-3 py-1.5"
                >
                  <span className="text-[10px] text-gray-400 w-14 text-right flex-shrink-0">
                    {day.date}
                  </span>
                  <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-accent-green transition-all"
                      style={{ width: `${day.passRate}%` }}
                      title={`Pass: ${day.passRate}%`}
                    />
                    <div
                      className="h-full bg-accent-amber transition-all"
                      style={{ width: `${day.flagRate}%` }}
                      title={`Flag: ${day.flagRate}%`}
                    />
                    <div
                      className="h-full bg-accent-red transition-all"
                      style={{ width: `${day.failRate}%` }}
                      title={`Fail: ${day.failRate}%`}
                    />
                  </div>
                  <div className="flex items-center gap-1 w-12 flex-shrink-0 justify-end">
                    {day.failRate > 0 && (
                      <span className="text-[10px] font-medium text-accent-red">
                        {day.failRate}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-accent-green" />
                <span className="text-[10px] text-gray-400">Pass</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-accent-amber" />
                <span className="text-[10px] text-gray-400">Flag</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-accent-red" />
                <span className="text-[10px] text-gray-400">Fail</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}