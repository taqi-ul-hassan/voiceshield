import type { LucideIcon } from "lucide-react";
import { cn } from "../lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  icon: LucideIcon;
  accentColor: string; // Tailwind class like "text-accent-blue"
  accentBg: string; // Tailwind class like "bg-blue-50"
  subtitle?: string;
}

export default function KPICard({
  title,
  value,
  trend,
  trendValue,
  icon: Icon,
  accentColor,
  accentBg,
  subtitle,
}: KPICardProps) {
  const trendIcon = trend === "up" ? "↑" : trend === "down" ? "↓" : "→";
  const trendColor =
    trend === "up"
      ? "text-accent-green"
      : trend === "down"
        ? "text-accent-red"
        : "text-slate-400";

  return (
    <div className="bg-card rounded-2xl border border-slate-100 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_20px_rgba(99,102,241,0.08)] hover:border-slate-200 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium truncate">
            {title}
          </p>
          <p className="text-4xl font-bold text-slate-900 mt-2 tracking-tight">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
          )}
          {trend && trendValue && (
            <p className={cn("text-xs font-medium mt-2", trendColor)}>
              <span className="mr-0.5">{trendIcon}</span>
              {trendValue}
            </p>
          )}
        </div>
        <div
          className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ml-3",
            accentBg
          )}
        >
          <Icon className={cn("w-5 h-5", accentColor)} />
        </div>
      </div>
    </div>
  );
}
