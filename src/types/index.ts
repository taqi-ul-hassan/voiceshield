export type Verdict = "pass" | "flag" | "fail";
export type Difficulty = "easy" | "medium" | "hard";
export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface PolicyRule {
  id: string;
  text: string;
  riskLevel: RiskLevel;
  category: string;
}

export interface Policy {
  id: string;
  title: string;
  category: string;
  summary: string;
  content: string;
  sourceUrl?: string;
  rules: PolicyRule[];
  lastUpdated: string;
  active: boolean;
}

export interface Scenario {
  id: string;
  title: string;
  riskCategory: string;
  difficulty: Difficulty;
  description: string;
  applicablePolicyIds: string[];
}

export interface Utterance {
  id: string;
  speaker: "customer" | "agent";
  text: string;
  verdict: Verdict;
  rationale: string;
  policyId?: string;
}

export interface Violation {
  utteranceId: string;
  policyId: string;
  verdict: Verdict;
  rationale: string;
}

export interface GuardrailPatch {
  id: string;
  content: string;
  applied: boolean;
}

export interface TestRun {
  id: string;
  scenarioId: string;
  date: string;
  duration: string;
  verdict: Verdict;
  status?: "running" | "completed";
  utterances: Utterance[];
  violations: Violation[];
  riskScore?: number;
  severity?: string;
  recommendedAction?: string;
  guardrailPatch?: GuardrailPatch;
  relatedRunId?: string;
}

export interface CategoryBreakdown {
  category: string;
  count: number;
  passRate: number;
  flagRate: number;
  failRate: number;
}

export interface RiskTrend {
  date: string;
  passRate: number;
  flagRate: number;
  failRate: number;
}

export interface MostFailedPolicy {
  policyId: string;
  failCount: number;
}

export interface RiskReport {
  totalTests: number;
  passRate: number;
  flagRate: number;
  failRate: number;
  categoryBreakdown: CategoryBreakdown[];
  mostFailedPolicies: MostFailedPolicy[];
  riskTrend: RiskTrend[];
}