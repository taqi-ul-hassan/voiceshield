import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "../lib/utils";
import type { LiveVerdict as Verdict } from "../features/voice-audit/types";

type Size = "sm" | "md" | "default";

interface StatusBadgeProps {
  verdict: Verdict;
  size?: Size;
  rationale?: string;
  showIcon?: boolean;
}

const sizeClasses: Record<Size, string> = {
  sm: "text-[10px] px-1.5 py-0.5 gap-1",
  md: "text-xs px-2 py-0.5 gap-1",
  default: "text-sm px-2.5 py-1 gap-1.5",
};

const iconSizes: Record<Size, string> = {
  sm: "w-3 h-3",
  md: "w-3.5 h-3.5",
  default: "w-4 h-4",
};

const config: Record<
  Verdict,
  { bg: string; text: string; label: string; icon: typeof CheckCircle }
> = {
  pass: {
    bg: "bg-green-50 text-accent-green border-green-200",
    text: "text-accent-green",
    label: "Pass",
    icon: CheckCircle,
  },
  flag: {
    bg: "bg-amber-50 text-accent-amber border-amber-200",
    text: "text-accent-amber",
    label: "Flag",
    icon: AlertTriangle,
  },
  fail: {
    bg: "bg-red-50 text-accent-red border-red-200",
    text: "text-accent-red",
    label: "Fail",
    icon: XCircle,
  },
};

export default function StatusBadge({
  verdict,
  size = "default",
  rationale,
  showIcon = true,
}: StatusBadgeProps) {
  const cfg = config[verdict];
  const Icon = cfg.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        cfg.bg,
        sizeClasses[size]
      )}
      title={rationale}
    >
      {showIcon && <Icon className={cn(iconSizes[size], cfg.text)} />}
      <span>{cfg.label}</span>
    </span>
  );
}
