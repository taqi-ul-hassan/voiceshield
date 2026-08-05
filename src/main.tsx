import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { RuntimeSettingsProvider } from "./features/voice-audit/runtime";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RuntimeSettingsProvider>
      <App />
    </RuntimeSettingsProvider>
  </StrictMode>
);
