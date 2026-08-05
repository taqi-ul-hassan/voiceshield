export type AgentRole = "airline" | "hospital" | "police" | "custom";
export type Persona = "minor" | "crisis" | "refund";
export type SpeechmaticsVoice = "sarah" | "theo" | "megan" | "jack";
export type AIProvider = "mock" | "aiml";
export type LiveVerdict = "pass" | "flag" | "fail";

export interface AgentConfig {
  role: AgentRole;
  customName?: string;
  customPolicy?: string;
}

export interface RuntimeSettings {
  aiProvider: AIProvider;
  aimlApiKey: string;
  aimlModel: string;
  speechmaticsApiKey: string;
  speechmaticsTtsUrl: string;
  defaultRole: AgentRole;
  defaultPersona: Persona;
  personVoice: SpeechmaticsVoice;
  draftVoice: SpeechmaticsVoice;
}

export interface ConversationTurn {
  id: string;
  speaker: "agent_person" | "agent_draft";
  text: string;
  turn: number;
}

export interface ComplianceFlag {
  articleReference: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  excerpt?: string;
}

export interface EvaluationResult {
  evaluationId: string;
  persona: Persona;
  overallCompliance: "compliant" | "partial" | "non_compliant";
  riskLevel: "minimal" | "limited" | "high" | "unacceptable";
  flags: ComplianceFlag[];
  summary: string;
}

export interface Conversation {
  id: string;
  status: "active" | "evaluating" | "evaluated" | "error";
  agentConfig: AgentConfig;
  persona: Persona;
  turns: ConversationTurn[];
  result?: EvaluationResult;
  error?: string;
  createdAt: string;
}

export interface LiveUtterance {
  id: string;
  speaker: "customer" | "agent";
  text: string;
  verdict: LiveVerdict;
  rationale: string;
  articleReference?: string;
}

export interface LiveViolation {
  id: string;
  articleReference: string;
  severity: ComplianceFlag["severity"];
  description: string;
  excerpt?: string;
}

export interface LiveTestRun {
  id: string;
  date: string;
  duration: string;
  agentConfig: AgentConfig;
  persona: Persona;
  verdict: LiveVerdict;
  riskLevel: EvaluationResult["riskLevel"];
  riskScore: number;
  summary: string;
  utterances: LiveUtterance[];
  violations: LiveViolation[];
}

export interface EuActArticle {
  articleNumber: string;
  title: string;
  chapter: string;
  summary: string;
  content: string;
  sourceUrl: string;
}

export function makeId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
