import {
  LayoutDashboard,
  FileText,
  FlaskConical,
  History,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Visible in Public (stakeholder) mode */
  public: boolean;
}

export const navItems: NavItem[] = [
  { to: "/", label: "Overview", icon: LayoutDashboard, public: true },
  { to: "/policies", label: "Policies", icon: FileText, public: false },
  { to: "/test-bench", label: "Test Bench", icon: FlaskConical, public: false },
  { to: "/test-runs", label: "Test Runs", icon: History, public: true },
  { to: "/risk-report", label: "Risk Report", icon: BarChart3, public: true },
  { to: "/settings", label: "Settings", icon: Settings, public: false },
];

/** Paths that are developer-only — blocked with a gate in Public mode. */
export const devOnlyPaths = ["/policies", "/test-bench", "/settings"];
