import { useState } from "react";
import { Plus, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { policies as initialPolicies } from "../data/demo";
import type { Policy } from "../types";
import { formatDate, cn } from "../lib/utils";

const categoryColors: Record<string, string> = {
  Refund: "border-l-accent-blue",
  Cancellation: "border-l-accent-amber",
  Medical: "border-l-accent-green",
  Baggage: "border-l-accent-red",
  Billing: "border-l-purple-500",
};

export default function Policies() {
  const [policies, setPolicies] = useState<Policy[]>(initialPolicies);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleActive = (id: string) => {
    setPolicies((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p))
    );
  };

  const activePolicies = policies.filter((p) => p.active);
  const inactivePolicies = policies.filter((p) => !p.active);

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Refund Policies</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your company's refund and compensation policies
          </p>
        </div>
        <button
          onClick={() => alert("Policy upload coming soon!")}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent-blue text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Policy
        </button>
      </div>

      <div className="mb-8">
        {activePolicies.length > 0 ? (
          <div className="space-y-4">
            {activePolicies.map((policy) => (
              <PolicyCard
                key={policy.id}
                policy={policy}
                expanded={expandedId === policy.id}
                onToggleExpand={() =>
                  setExpandedId(expandedId === policy.id ? null : policy.id)
                }
                onToggleActive={() => toggleActive(policy.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-card rounded-xl border border-gray-100">
            <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              All policies are inactive.{" "}
              <button
                onClick={() =>
                  setPolicies((prev) => prev.map((p) => ({ ...p, active: true })))
                }
                className="text-accent-blue underline cursor-pointer"
              >
                Reactivate all
              </button>
            </p>
          </div>
        )}
      </div>

      {inactivePolicies.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Inactive Policies ({inactivePolicies.length})
          </h2>
          <div className="space-y-3">
            {inactivePolicies.map((policy) => (
              <PolicyCard
                key={policy.id}
                policy={policy}
                expanded={expandedId === policy.id}
                onToggleExpand={() =>
                  setExpandedId(expandedId === policy.id ? null : policy.id)
                }
                onToggleActive={() => toggleActive(policy.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PolicyCard({
  policy,
  expanded,
  onToggleExpand,
  onToggleActive,
}: {
  policy: Policy;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleActive: () => void;
}) {
  const borderColor = categoryColors[policy.category] ?? "border-l-gray-300";

  return (
    <div
      className={cn(
        "bg-card rounded-xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-150",
        borderColor,
        "border-l-[3px]"
      )}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold text-gray-900">{policy.title}</h3>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 uppercase tracking-wide">
                {policy.category}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1.5 line-clamp-2">{policy.summary}</p>
            <p className="text-xs text-gray-400 mt-2">
              Last updated {formatDate(policy.lastUpdated)}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={policy.active}
                onChange={onToggleActive}
                className="sr-only peer"
                aria-label={`Toggle ${policy.title}`}
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus-visible:outline-2 peer-focus-visible:outline-accent-blue rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-blue" />
            </label>

            <button
              onClick={onToggleExpand}
              className="p-1 rounded-md hover:bg-gray-100 transition-colors cursor-pointer text-gray-400"
              aria-label={expanded ? "Collapse details" : "Expand details"}
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-sm text-gray-600 leading-relaxed">
              <p>{policy.content}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}