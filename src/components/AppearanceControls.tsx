import { Eye, Wrench } from "lucide-react";
import { cn } from "../lib/utils";
import { useAppearance, type AppMode, type ThemeVariant } from "../features/appearance/appearance";

type Size = "sm" | "md";

const modeOptions: { value: AppMode; label: string; icon: typeof Wrench }[] = [
  { value: "developer", label: "Developer", icon: Wrench },
  { value: "public", label: "Public", icon: Eye },
];

const themeOptions: { value: ThemeVariant; label: string; swatch: string; swatchBorder: string; ring: string }[] = [
  { value: "a", label: "Rose", swatch: "#ffaec9", swatchBorder: "rgba(0,0,0,0.35)", ring: "ring-[#000000]/40" },
  { value: "b", label: "Noir", swatch: "#000000", swatchBorder: "rgba(255,174,201,0.8)", ring: "ring-[#ffaec9]" },
];

const sizeClasses: Record<Size, { control: string; button: string; icon: string; label: string }> = {
  sm: {
    control: "p-1 gap-1 rounded-full",
    button: "px-2.5 py-1.5 gap-1.5 text-[11px]",
    icon: "w-3.5 h-3.5",
    label: "",
  },
  md: {
    control: "p-1.5 gap-1.5 rounded-full",
    button: "px-4 py-2 gap-2 text-xs",
    icon: "w-4 h-4",
    label: "",
  },
};

export function ModeSwitcher({ size = "md", className }: { size?: Size; className?: string }) {
  const { mode, setMode } = useAppearance();
  const s = sizeClasses[size];

  return (
    <div
      role="group"
      aria-label="App mode"
      className={cn("flex items-center border border-app-border bg-app-soft", s.control, className)}
    >
      {modeOptions.map(({ value, label, icon: Icon }) => {
        const active = mode === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            title={`${label} mode`}
            onClick={() => setMode(value)}
            className={cn(
              "flex flex-1 items-center justify-center rounded-full font-semibold transition-colors duration-150 cursor-pointer",
              s.button,
              active ? "bg-ab text-ab-fg shadow-sm" : "text-app-muted hover:text-app-fg"
            )}
          >
            <Icon className={cn(s.icon, "flex-shrink-0")} />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ThemeSwitcher({ size = "md", className }: { size?: Size; className?: string }) {
  const { variant, setVariant } = useAppearance();
  const s = sizeClasses[size];

  return (
    <div
      role="group"
      aria-label="Color theme"
      className={cn("flex items-center border border-app-border bg-app-soft", s.control, className)}
    >
      {themeOptions.map(({ value, label, swatch, swatchBorder, ring }) => {
        const active = variant === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            title={`${label} theme`}
            onClick={() => setVariant(value)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-full font-semibold transition-colors duration-150 cursor-pointer",
              s.button,
              active ? cn("bg-app-soft2 text-app-fg ring-2 ring-offset-2 ring-offset-app-bg", ring) : "text-app-muted hover:text-app-fg"
            )}
          >
            <span
              aria-hidden="true"
              className="w-4 h-4 rounded-full border flex-shrink-0"
              style={{ background: swatch, borderColor: swatchBorder }}
            />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
