import { Eye, Menu, X } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAppearance } from "../features/appearance/appearance";
import { cn } from "../lib/utils";
import { ModeSwitcher } from "./AppearanceControls";
import Logo from "./Logo";
import { devOnlyPaths, navItems } from "./nav-items";
import Sidebar from "./Sidebar";

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { isPublic, setMode } = useAppearance();

  const isDevBlocked = devOnlyPaths.some(
    (path) => location.pathname === path || location.pathname.startsWith(`${path}/`)
  );

  const visibleItems = navItems.filter((item) => !isPublic || item.public);

  return (
    <div className="flex h-screen bg-app-bg text-app-fg">
      {/* Desktop Sidebar — hidden on mobile */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between gap-3 bg-app-bg border-b border-app-border px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <Logo className="w-8 h-8 text-app-fg" />
          <span className="text-app-fg font-semibold text-sm">VoiceShield</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <ModeSwitcher size="sm" className="hidden sm:flex" />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-app-fg p-1 rounded-md hover:bg-app-soft transition-colors cursor-pointer"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-20 bg-app-bg pt-14 overflow-y-auto">
          <nav className="flex flex-col gap-1 px-4 py-4" aria-label="Mobile navigation">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-ab text-ab-fg font-semibold shadow-sm"
                        : "text-app-muted hover:bg-app-soft hover:text-app-fg"
                    )
                  }
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
          <div className="px-4 py-4 border-t border-app-border mt-2 space-y-2">
            <ModeSwitcher size="sm" />
            <p className="text-app-muted text-xs font-semibold tracking-tight pt-2">VoiceGate</p>
            <p className="text-app-muted/70 text-[10px]">Voice Compliance QA</p>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main
        className={cn(
          "flex-1 overflow-y-auto bg-app-bg",
          "lg:pt-0 pt-14" // top padding on mobile for fixed header
        )}
      >
        <div className="p-5 sm:p-8 lg:p-10 pb-20 max-w-6xl mx-auto">
          {isPublic && isDevBlocked ? <PublicGate onSwitch={() => setMode("developer")} /> : <Outlet />}
        </div>
      </main>
    </div>
  );
}

function PublicGate({ onSwitch }: { onSwitch: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24">
      <div className="w-20 h-20 rounded-full bg-app-soft2 flex items-center justify-center mb-6">
        <Eye className="w-9 h-9 text-app-accent" />
      </div>
      <h1 className="text-2xl font-bold text-app-fg tracking-tight">This page is developer-only</h1>
      <p className="text-sm text-app-muted max-w-md mt-3 leading-relaxed">
        Public mode keeps a calm, read-only view for stakeholders — the overview, test results
        and the risk report. Running tests, editing policies and configuration live in
        Developer mode.
      </p>
      <button
        type="button"
        onClick={onSwitch}
        className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-ab text-ab-fg text-sm font-semibold hover:opacity-90 active:scale-[0.97] transition-all duration-150 cursor-pointer shadow-sm"
      >
        Switch to Developer mode
      </button>
    </div>
  );
}
