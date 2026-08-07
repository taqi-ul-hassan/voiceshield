import type { LucideIcon } from "lucide-react";
import { cn } from "../lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  icon: LucideIcon;
  accentColor: string; // Tailwind class like "text-accent-green"
  accentBg: string; // Tailwind class like "bg-green-50"
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
      ? "text-pass-text"
      : trend === "down"
        ? "text-fail-text"
        : "text-app-muted";

  return (
    <div className="bg-app-card rounded-2xl border border-app-border p-6 shadow-sm transition-all duration-200 hover:bg-app-card-hover hover:border-app-border-strong hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wider text-app-muted font-medium truncate">
            {title}
          </p>
          <p className="text-4xl font-bold text-app-fg mt-2 tracking-tight">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-app-muted mt-1">{subtitle}</p>
          )}
          {trend && trendValue && (
            <p className={cn("text-xs font-medium mt-2", trendColor)}>
              <span className="mr-0.5" aria-hidden="true">{trendIcon}</span>
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
