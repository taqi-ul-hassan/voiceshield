import { NavLink } from "react-router-dom";
import { cn } from "../lib/utils";
import Logo from "./Logo";
import { ModeSwitcher, ThemeSwitcher } from "./AppearanceControls";
import { navItems } from "./nav-items";
import { useAppearance } from "../features/appearance/appearance";

export default function Sidebar() {
  const { isPublic } = useAppearance();
  const visibleItems = navItems.filter((item) => !isPublic || item.public);

  return (
    <aside className="w-64 h-screen flex-shrink-0 bg-app-bg border-r border-app-border flex flex-col overflow-y-auto">
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-8">
        <Logo className="w-9 h-9 text-app-fg" />
        <span className="text-app-fg text-lg font-semibold tracking-tight">VoiceShield</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1 px-3" aria-label="Main navigation">
        {visibleItems.map((item) => {
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
                    ? "bg-ab text-ab-fg shadow-sm font-semibold"
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

      {/* Footer — mode & theme switchers + meta */}
      <div className="px-3 py-3 border-t border-app-border space-y-2">
        <ModeSwitcher size="sm" />
        <ThemeSwitcher size="sm" />
        <div className="pt-2 mt-1 border-t border-app-border">
          <p className="text-app-muted text-xs">Meridian Financial</p>
          <p className="text-app-muted/70 text-[10px]">Demo Environment</p>
        </div>
      </div>
    </aside>
  );
}
