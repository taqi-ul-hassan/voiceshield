import type { Conversation, LiveTestRun } from "./types";
import { useEffect, useState } from "react";

const STORAGE_KEY = "voiceshield:test-runs:v1";
const CHANGE_EVENT = "voiceshield:runs-changed";

export function getStoredRuns(): LiveTestRun[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as LiveTestRun[]) : [];
  } catch {
    return [];
  }
}

export function saveRunToStorage(run: LiveTestRun): void {
  const runs = [run, ...getStoredRuns().filter((r) => r.id !== run.id)].slice(0, 100);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

export function clearStoredRuns(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

export function exportBackupJSON(): string {
  const runs = getStoredRuns();
  return JSON.stringify(
    {
      version: "2.0",
      exportDate: new Date().toISOString(),
      runsCount: runs.length,
      runs,
    },
    null,
    2
  );
}

export function importBackupJSON(jsonString: string): { success: boolean; count: number; error?: string } {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || !Array.isArray(parsed.runs)) {
      return { success: false, count: 0, error: "Invalid VoiceShield backup schema" };
    }
    const current = getStoredRuns();
    const map = new Map<string, LiveTestRun>();
    for (const r of [...parsed.runs, ...current]) {
      if (r && r.id) map.set(r.id, r);
    }
    const combined = Array.from(map.values());
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(combined));
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return { success: true, count: parsed.runs.length };
  } catch (err) {
    return { success: false, count: 0, error: (err as Error).message };
  }
}

/** Vault functions were removed — provider keys now live only on the server (server/proxy.ts). */

export function saveConversationRun(conversation: Conversation): LiveTestRun {
  if (!conversation.result) throw new Error("Cannot save a conversation without an evaluation result.");

  const result = conversation.result;
  const utterances = conversation.turns.map((turn) => {
    const isAgent = turn.speaker === "agent_draft";
    const matchingFlag = isAgent
      ? result.flags.find((flag) => flag.excerpt && turn.text.includes(flag.excerpt))
      : undefined;
    return {
      id: turn.id,
      speaker: isAgent ? ("agent" as const) : ("customer" as const),
      text: turn.text,
      verdict: matchingFlag ? flagVerdict(matchingFlag.severity) : ("pass" as const),
      rationale: matchingFlag?.description || (isAgent ? "No issue was identified for this agent response." : "Caller turn recorded."),
      articleReference: matchingFlag?.articleReference,
    };
  });

  const run: LiveTestRun = {
    id: conversation.id,
    date: conversation.createdAt,
    duration: `${Math.max(1, Math.ceil(conversation.turns.length * 0.4))}m`,
    agentConfig: conversation.agentConfig,
    persona: conversation.persona,
    verdict: complianceVerdict(result.overallCompliance),
    riskLevel: result.riskLevel,
    riskScore: riskScore(result.riskLevel),
    summary: result.summary,
    utterances,
    violations: result.flags.map((flag, index) => ({
      id: `${conversation.id}-flag-${index + 1}`,
      articleReference: flag.articleReference,
      severity: flag.severity,
      description: flag.description,
      excerpt: flag.excerpt,
    })),
  };

  saveRunToStorage(run);
  return run;
}

export function useStoredRuns(): LiveTestRun[] {
  const [runs, setRuns] = useState<LiveTestRun[]>(getStoredRuns);

  useEffect(() => {
    const refresh = () => setRuns(getStoredRuns());
    window.addEventListener(CHANGE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return runs;
}

export const runsChangedEvent = CHANGE_EVENT;

function complianceVerdict(compliance: NonNullable<Conversation["result"]>["overallCompliance"]): LiveTestRun["verdict"] {
  if (compliance === "compliant") return "pass";
  if (compliance === "partial") return "flag";
  return "fail";
}

function flagVerdict(severity: LiveTestRun["violations"][number]["severity"]): LiveTestRun["verdict"] {
  return severity === "high" || severity === "critical" ? "fail" : "flag";
}

function riskScore(level: NonNullable<Conversation["result"]>["riskLevel"]): number {
  if (level === "minimal") return 10;
  if (level === "limited") return 35;
  if (level === "high") return 70;
  return 95;
}
