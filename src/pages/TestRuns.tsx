import { useNavigate } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import { testRuns, scenarios } from "../data/demo";
import { formatDate, shortId } from "../lib/utils";
import StatusBadge from "../components/StatusBadge";

export default function TestRuns() {
  const navigate = useNavigate();

  const getScenarioName = (scenarioId: string) =>
    scenarios.find((s) => s.id === scenarioId)?.title ?? "Unknown Scenario";

  // Sort: newest first
  const sortedRuns = [...testRuns].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const calculatePassRate = (
    utterances: { verdict: "pass" | "flag" | "fail" }[]
  ) => {
    if (utterances.length === 0) return 0;
    const passed = utterances.filter((u) => u.verdict === "pass").length;
    return Math.round((passed / utterances.length) * 100);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Test Runs</h1>
        <p className="text-sm text-gray-500 mt-1">
          History of all scenario simulations
        </p>
      </div>

      {sortedRuns.length > 0 ? (
        <div className="bg-card rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">
                All test runs with scenario, date, verdict, duration, and pass rate
              </caption>
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th scope="col" className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Run ID
                  </th>
                  <th scope="col" className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Scenario
                  </th>
                  <th scope="col" className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Verdict
                  </th>
                  <th scope="col" className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Duration
                  </th>
                  <th scope="col" className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Pass Rate
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedRuns.map((run) => (
                  <tr
                    key={run.id}
                    onClick={() => navigate(`/test-runs/${run.id}`)}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") navigate(`/test-runs/${run.id}`);
                    }}
                    role="link"
                    aria-label={`View test run ${shortId(run.id)}`}
                  >
                    <td className="px-6 py-3.5 text-xs font-mono text-gray-500">
                      {shortId(run.id)}
                    </td>
                    <td className="px-6 py-3.5 text-sm text-gray-900 max-w-[220px] truncate">
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
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent-green rounded-full"
                            style={{
                              width: `${calculatePassRate(run.utterances)}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">
                          {calculatePassRate(run.utterances)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-card rounded-xl border border-gray-100">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-sm text-gray-500 mb-2">No test runs yet</p>
          <button
            onClick={() => navigate("/test-bench")}
            className="text-accent-blue text-sm font-medium hover:underline cursor-pointer"
          >
            Go to Test Bench to run your first scenario →
          </button>
        </div>
      )}
    </div>
  );
}