import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { RuntimeSettingsProvider } from "./features/voice-audit/runtime";
import { AppearanceProvider } from "./features/appearance/appearance";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppearanceProvider>
      <RuntimeSettingsProvider>
        <App />
      </RuntimeSettingsProvider>
    </AppearanceProvider>
  </StrictMode>
);
