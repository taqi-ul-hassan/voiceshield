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
        <h1 className="text-2xl font-bold text-app-fg">Test Runs</h1>
        <p className="text-sm text-app-muted mt-1">Every conversation you've run, saved in this browser</p>
      </div>

      {runs.length === 0 ? (
        <div className="text-center py-20 bg-app-card rounded-2xl border border-app-border shadow-sm">
          <div className="w-16 h-16 rounded-full bg-app-soft2 flex items-center justify-center mx-auto mb-5">
            <ClipboardList className="w-8 h-8 text-app-muted/70" />
          </div>
          <h2 className="text-lg font-semibold text-app-fg">Nothing here yet</h2>
          <p className="text-sm text-app-muted mt-2 max-w-sm mx-auto leading-relaxed">
            Your saved runs will show up here — complete with transcripts, findings and
            ready-made guardrail patches. Run your first one to get started.
          </p>
          <button type="button" onClick={() => navigate("/test-bench")} className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-ab text-ab-fg text-sm font-medium hover:opacity-90 active:scale-[0.97] transition-all duration-150 cursor-pointer shadow-sm">
            Open the Test Bench
          </button>
        </div>
      ) : (
        <div className="bg-app-card rounded-2xl border border-app-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-app-border bg-app-soft/50"><th className={th}>Run ID</th><th className={th}>Agent</th><th className={th}>Persona</th><th className={th}>Date</th><th className={th}>Verdict</th><th className={th}>Risk</th><th className={th}>Flags</th></tr></thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} onClick={() => navigate(`/test-runs/${run.id}`)} className="border-b border-app-border hover:bg-app-soft cursor-pointer transition-colors duration-150">
                    <td className="px-6 py-3.5 text-xs font-mono text-app-muted">{shortId(run.id)}</td>
                    <td className="px-6 py-3.5 text-sm text-app-fg">{roleLabels[run.agentConfig.role]}</td>
                    <td className="px-6 py-3.5 text-sm text-app-muted capitalize">{run.persona}</td>
                    <td className="px-6 py-3.5 text-sm text-app-muted">{formatDate(run.date)}</td>
                    <td className="px-6 py-3.5"><StatusBadge verdict={run.verdict} size="sm" /></td>
                    <td className="px-6 py-3.5 text-sm text-app-muted capitalize">{run.riskLevel}</td>
                    <td className="px-6 py-3.5 text-sm text-app-muted">{run.violations.length}</td>
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

const th = "text-left px-6 py-3 text-xs font-medium text-app-muted uppercase tracking-wider";
