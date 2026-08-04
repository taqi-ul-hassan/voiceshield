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
        : "text-gray-400";

  return (
    <div className="bg-card rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-500 font-medium truncate">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1 tracking-tight">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
          )}
          {trend && trendValue && (
            <p className={cn("text-xs font-medium mt-1.5", trendColor)}>
              <span className="mr-0.5">{trendIcon}</span>
              {trendValue}
            </p>
          )}
        </div>
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ml-3",
            accentBg
          )}
        >
          <Icon className={cn("w-5 h-5", accentColor)} />
        </div>
      </div>
    </div>
  );
}