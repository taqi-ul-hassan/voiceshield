import { Check } from "lucide-react";
import type { Scenario } from "../types";
import { cn } from "../lib/utils";

interface ScenarioCardProps {
  scenario: Scenario;
  selected: boolean;
  onSelect: () => void;
}

const riskColors: Record<string, string> = {
  easy: "bg-green-50 text-green-700 border-green-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  hard: "bg-red-50 text-red-700 border-red-200",
};

const riskLabels: Record<string, string> = {
  easy: "Low Risk",
  medium: "Medium Risk",
  hard: "High Risk",
};

export default function ScenarioCard({
  scenario,
  selected,
  onSelect,
}: ScenarioCardProps) {
  return (
    <div
      className={cn(
        "bg-card rounded-2xl border-2 p-6 transition-all duration-200",
        selected
          ? "border-accent-purple shadow-[0_4px_20px_rgba(99,102,241,0.12)] ring-1 ring-accent-purple/20"
          : "border-slate-100 hover:border-slate-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)]"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Title + Risk Tag */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h3 className="text-base font-semibold text-slate-900 tracking-tight">
              {scenario.title}
            </h3>
            <span
              className={cn(
                "text-[10px] font-medium px-2 py-0.5 rounded-full border uppercase tracking-wide",
                riskColors[scenario.difficulty]
              )}
            >
              {riskLabels[scenario.difficulty] || scenario.difficulty}
            </span>
          </div>

          {/* Category */}
          <p className="text-xs text-slate-500 mb-2">
            <span className="font-medium">Category:</span>{" "}
            {scenario.riskCategory}
          </p>

          {/* Description */}
          <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">
            {scenario.description}
          </p>
        </div>

        {/* Select Button */}
        <button
          type="button"
          onClick={onSelect}
          className={cn(
            "flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 active:scale-[0.97]",
            selected
              ? "bg-gradient-to-br from-accent-purple to-accent-violet text-white shadow-[0_2px_8px_rgba(99,102,241,0.3)] cursor-default"
              : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 cursor-pointer"
          )}
        >
          {selected ? (
            <>
              <Check className="w-4 h-4" />
              Selected
            </>
          ) : (
            "Select"
          )}
        </button>
      </div>
    </div>
  );
}
