import { createContext, useContext, useMemo, useState, type PropsWithChildren } from "react";
import type { RuntimeSettings } from "./types";

export const DEFAULT_RUNTIME_SETTINGS: RuntimeSettings = {
  aiProvider: "mock",
  aimlApiKey: "",
  aimlModel: "deepseek/deepseek-v4-flash",
  speechmaticsApiKey: "",
  speechmaticsTtsUrl: "https://preview.tts.speechmatics.com",
  defaultRole: "airline",
  defaultPersona: "minor",
  personVoice: "megan",
  draftVoice: "theo",
};

interface RuntimeSettingsContextValue {
  settings: RuntimeSettings;
  updateSettings: (updates: Partial<RuntimeSettings>) => void;
  clearProviderKeys: () => void;
}

const RuntimeSettingsContext = createContext<RuntimeSettingsContextValue | null>(null);

export function RuntimeSettingsProvider({ children }: PropsWithChildren) {
  const [settings, setSettings] = useState<RuntimeSettings>(DEFAULT_RUNTIME_SETTINGS);

  const value = useMemo<RuntimeSettingsContextValue>(
    () => ({
      settings,
      updateSettings: (updates) => setSettings((current) => ({ ...current, ...updates })),
      clearProviderKeys: () =>
        setSettings((current) => ({
          ...current,
          aimlApiKey: "",
          speechmaticsApiKey: "",
        })),
    }),
    [settings]
  );

  return <RuntimeSettingsContext.Provider value={value}>{children}</RuntimeSettingsContext.Provider>;
}

export function useRuntimeSettings(): RuntimeSettingsContextValue {
  const value = useContext(RuntimeSettingsContext);
  if (!value) {
    throw new Error("useRuntimeSettings must be used inside RuntimeSettingsProvider");
  }
  return value;
}
