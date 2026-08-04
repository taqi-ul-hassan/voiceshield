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
        "bg-card rounded-xl border-2 p-5 transition-all duration-150",
        selected
          ? "border-accent-blue shadow-md ring-1 ring-accent-blue/20"
          : "border-gray-100 hover:border-gray-200 hover:shadow-sm"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Title + Risk Tag */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-sm font-semibold text-gray-900">
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
          <p className="text-xs text-gray-500 mb-2">
            <span className="font-medium">Category:</span>{" "}
            {scenario.riskCategory}
          </p>

          {/* Description */}
          <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
            {scenario.description}
          </p>
        </div>

        {/* Select Button */}
        <button
          type="button"
          onClick={onSelect}
          className={cn(
            "flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150",
            selected
              ? "bg-accent-blue text-white shadow-sm cursor-default"
              : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 hover:border-gray-300 cursor-pointer"
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