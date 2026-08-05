import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  FlaskConical,
  History,
  BarChart3,
  Settings,
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
    <aside className="w-64 h-screen flex-shrink-0 bg-navy-900 flex flex-col overflow-y-auto">
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-8">
        <img 
          src="/logo-icon.svg" 
          alt="VoiceShield" 
          className="w-9 h-9"
        />
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
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
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
      <div className="px-5 py-4 border-t border-white/10">
        <p className="text-slate-500 text-xs">Meridian Financial</p>
        <p className="text-slate-600 text-[10px]">Demo Environment</p>
      </div>
    </aside>
  );
}
