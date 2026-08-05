import { Outlet, NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  FlaskConical,
  History,
  BarChart3,
  Settings,
  Shield,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "../lib/utils";
import Sidebar from "./Sidebar";

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-surface">
      {/* Desktop Sidebar — hidden on mobile */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between bg-navy-900 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent-blue flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-semibold text-sm">VoiceShield</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-white p-1 rounded-md hover:bg-navy-800 transition-colors"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-20 bg-navy-900 pt-14">
          <nav className="flex flex-col gap-1 px-4 py-4" aria-label="Mobile navigation">
            {[
              { to: "/", label: "Overview", icon: LayoutDashboard },
              { to: "/policies", label: "Policies", icon: FileText },
              { to: "/test-bench", label: "Test Bench", icon: FlaskConical },
              { to: "/test-runs", label: "Test Runs", icon: History },
              { to: "/risk-report", label: "Risk Report", icon: BarChart3 },
              { to: "/settings", label: "Settings", icon: Settings },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-150",
                      isActive
                        ? "bg-navy-800 text-white"
                        : "text-navy-300 hover:bg-navy-800/60 hover:text-white"
                    )
                  }
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
          <div className="px-4 py-4 border-t border-navy-700/50 mt-2">
            <p className="text-navy-500 text-xs">Meridian Financial</p>
            <p className="text-navy-600 text-[10px]">Demo Environment</p>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main
        className={cn(
          "flex-1 overflow-y-auto bg-surface",
          "lg:pt-0 pt-14" // top padding on mobile for fixed header
        )}
      >
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}