import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

export type AppMode = "developer" | "public";
export type ThemeVariant = "a" | "b";

const MODE_KEY = "voiceshield:app-mode";
const THEME_KEY = "voiceshield:theme-variant";

interface AppearanceContextValue {
  mode: AppMode;
  variant: ThemeVariant;
  isDeveloper: boolean;
  isPublic: boolean;
  setMode: (mode: AppMode) => void;
  setVariant: (variant: ThemeVariant) => void;
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable — ignore */
  }
}

export function AppearanceProvider({ children }: PropsWithChildren) {
  const [mode, setMode] = useState<AppMode>(() => (readStored(MODE_KEY) === "public" ? "public" : "developer"));
  const [variant, setVariant] = useState<ThemeVariant>(() => (readStored(THEME_KEY) === "b" ? "b" : "a"));

  useEffect(() => {
    writeStored(MODE_KEY, mode);
  }, [mode]);

  useEffect(() => {
    writeStored(THEME_KEY, variant);
    const root = document.documentElement;
    root.classList.remove("theme-a", "theme-b");
    root.classList.add(variant === "a" ? "theme-a" : "theme-b");
    root.style.colorScheme = variant === "a" ? "light" : "dark";
  }, [variant]);

  const value = useMemo<AppearanceContextValue>(
    () => ({
      mode,
      variant,
      isDeveloper: mode === "developer",
      isPublic: mode === "public",
      setMode,
      setVariant,
    }),
    [mode, variant]
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance(): AppearanceContextValue {
  const value = useContext(AppearanceContext);
  if (!value) {
    throw new Error("useAppearance must be used inside AppearanceProvider");
  }
  return value;
}
