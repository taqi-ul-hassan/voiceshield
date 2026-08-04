import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  FlaskConical,
  History,
  BarChart3,
  Settings,
  Shield,
} from "lucide-react";
import { cn } from "../lib/utils";

const navItems = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/policies", label: "Policies", icon: FileText },
  { to: "/test-bench", label: "Test Bench", icon: FlaskConical },
  { to: "/test-runs", label: "Test Runs", icon: History },
  { to: "/risk-report", label: "Risk Report", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="w-60 h-screen flex-shrink-0 bg-navy-900 flex flex-col overflow-y-auto">
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-8">
        <div className="w-9 h-9 rounded-lg bg-accent-blue flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <span className="text-white text-lg font-semibold tracking-tight">
          VoiceShield
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1 px-3" aria-label="Main navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-navy-800 text-white border-l-[3px] border-accent-blue rounded-l-none"
                    : "text-navy-300 hover:bg-navy-800/60 hover:text-white border-l-[3px] border-transparent rounded-l-none"
                )
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-navy-700/50">
        <p className="text-navy-500 text-xs">SkyPath Airlines</p>
        <p className="text-navy-600 text-[10px]">Demo Environment</p>
      </div>
    </aside>
  );
}