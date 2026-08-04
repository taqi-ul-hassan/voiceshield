import { useState } from "react";
import { Save, Building2, Bot, Bell } from "lucide-react";
import { cn } from "../lib/utils";

export default function Settings() {
  const [companyName, setCompanyName] = useState("SkyPath Airlines");
  const [industry, setIndustry] = useState("Airlines");
  const [agentName, setAgentName] = useState("SkyPath Support Agent");
  const [tone, setTone] = useState("professional");
  const [welcomeMessage, setWelcomeMessage] = useState(
    "Welcome to SkyPath Airlines. How can I help you today?"
  );
  const [saved, setSaved] = useState(false);
  const [notifications, setNotifications] = useState({
    dailyDigest: true,
    criticalFailures: true,
    weeklyReport: false,
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure your company profile and agent guardrails
        </p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* Company Profile */}
        <section className="bg-card rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
            <Building2 className="w-4 h-4 text-gray-400" />
            <h2 className="text-base font-semibold text-gray-900">
              Company Profile
            </h2>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div>
              <label
                htmlFor="company-name"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Company Name
              </label>
              <input
                id="company-name"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue transition-shadow"
              />
            </div>
            <div>
              <label
                htmlFor="industry"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Industry
              </label>
              <select
                id="industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue transition-shadow bg-white"
              >
                <option value="Airlines">Airlines</option>
                <option value="Hospitality">Hospitality</option>
                <option value="Retail">Retail</option>
                <option value="Banking">Banking</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Insurance">Insurance</option>
                <option value="Technology">Technology</option>
              </select>
            </div>
          </div>
        </section>

        {/* Agent Persona */}
        <section className="bg-card rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
            <Bot className="w-4 h-4 text-gray-400" />
            <h2 className="text-base font-semibold text-gray-900">
              Agent Persona
            </h2>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div>
              <label
                htmlFor="agent-name"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Agent Name
              </label>
              <input
                id="agent-name"
                type="text"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue transition-shadow"
              />
            </div>
            <div>
              <label
                htmlFor="tone"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Tone
              </label>
              <select
                id="tone"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue transition-shadow bg-white"
              >
                <option value="professional">Professional</option>
                <option value="friendly">Friendly & Casual</option>
                <option value="formal">Formal</option>
                <option value="empathetic">Empathetic</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="welcome-message"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Welcome Message
              </label>
              <textarea
                id="welcome-message"
                rows={3}
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue transition-shadow resize-none"
              />
            </div>
          </div>
        </section>

        {/* Notification Preferences */}
        <section className="bg-card rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
            <Bell className="w-4 h-4 text-gray-400" />
            <h2 className="text-base font-semibold text-gray-900">
              Notification Preferences
            </h2>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Daily Digest
                </p>
                <p className="text-xs text-gray-400">
                  Receive a daily summary of test results
                </p>
              </div>
              <button
                onClick={() => toggleNotification("dailyDigest")}
                role="switch"
                aria-checked={notifications.dailyDigest}
                aria-label="Toggle daily digest"
                className={cn(
                  "relative w-10 h-6 rounded-full transition-colors duration-200 cursor-pointer",
                  notifications.dailyDigest
                    ? "bg-accent-blue"
                    : "bg-gray-200"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200",
                    notifications.dailyDigest && "translate-x-4"
                  )}
                />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Critical Failures
                </p>
                <p className="text-xs text-gray-400">
                  Instant alerts when a test fails critically
                </p>
              </div>
              <button
                onClick={() => toggleNotification("criticalFailures")}
                role="switch"
                aria-checked={notifications.criticalFailures}
                aria-label="Toggle critical failures alerts"
                className={cn(
                  "relative w-10 h-6 rounded-full transition-colors duration-200 cursor-pointer",
                  notifications.criticalFailures
                    ? "bg-accent-blue"
                    : "bg-gray-200"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200",
                    notifications.criticalFailures && "translate-x-4"
                  )}
                />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Weekly Report
                </p>
                <p className="text-xs text-gray-400">
                  Detailed weekly risk report via email
                </p>
              </div>
              <button
                onClick={() => toggleNotification("weeklyReport")}
                role="switch"
                aria-checked={notifications.weeklyReport}
                aria-label="Toggle weekly report"
                className={cn(
                  "relative w-10 h-6 rounded-full transition-colors duration-200 cursor-pointer",
                  notifications.weeklyReport
                    ? "bg-accent-blue"
                    : "bg-gray-200"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200",
                    notifications.weeklyReport && "translate-x-4"
                  )}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer",
              saved
                ? "bg-accent-green text-white"
                : "bg-accent-blue text-white hover:bg-blue-600 shadow-sm"
            )}
          >
            <Save className="w-4 h-4" />
            {saved ? "Saved!" : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}