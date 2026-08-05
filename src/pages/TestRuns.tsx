import { useNavigate } from "react-router-dom";
import { ClipboardList } from "lucide-react";
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

export default function TestRuns() {
  const navigate = useNavigate();
  const runs = useStoredRuns();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Test Runs</h1>
        <p className="text-sm text-gray-500 mt-1">Completed conversations saved in this browser</p>
      </div>

      {runs.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-xl border border-gray-100">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-sm text-gray-500 mb-2">No test runs yet</p>
          <button type="button" onClick={() => navigate("/test-bench")} className="text-accent-blue text-sm font-medium hover:underline">Open Test Bench to run a scenario</button>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 bg-gray-50/50"><th className={th}>Run ID</th><th className={th}>Agent</th><th className={th}>Persona</th><th className={th}>Date</th><th className={th}>Verdict</th><th className={th}>Risk</th><th className={th}>Flags</th></tr></thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} onClick={() => navigate(`/test-runs/${run.id}`)} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer">
                    <td className="px-6 py-3.5 text-xs font-mono text-gray-500">{shortId(run.id)}</td>
                    <td className="px-6 py-3.5 text-sm text-gray-900">{roleLabels[run.agentConfig.role]}</td>
                    <td className="px-6 py-3.5 text-sm text-gray-500 capitalize">{run.persona}</td>
                    <td className="px-6 py-3.5 text-sm text-gray-500">{formatDate(run.date)}</td>
                    <td className="px-6 py-3.5"><StatusBadge verdict={run.verdict} size="sm" /></td>
                    <td className="px-6 py-3.5 text-sm text-gray-500 capitalize">{run.riskLevel}</td>
                    <td className="px-6 py-3.5 text-sm text-gray-500">{run.violations.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const th = "text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider";
