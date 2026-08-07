import { LiveTestRun, PolicyRule } from "./types";

export interface SystemPromptPatch {
  ruleId: string;
  article: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  foundViolation: string;
  suggestedGuardrail: string;
  systemPromptAddendum: string;
}

export function generateMitigationsForRun(
  run: LiveTestRun,
  activePolicies: PolicyRule[]
): SystemPromptPatch[] {
  const patches: SystemPromptPatch[] = [];
  const flagsToProcess = run.flags || run.violations.map((v) => ({
    ruleId: v.id,
    article: v.articleReference || "Article 5",
    severity: v.severity,
    description: v.description,
    excerpt: v.excerpt,
  }));

  for (const flag of flagsToProcess) {
    const matchingPolicy = activePolicies.find(
      (p) => p.id === flag.ruleId || p.article === flag.article
    );
    if (matchingPolicy) {
      // referenced if needed
    }

    let guardrailText = "";
    let systemAddendum = "";

    switch (flag.article) {
      case "Article 5":
        guardrailText =
          "STRICT PROHIBITION: Do NOT attempt emotion recognition, biometric categorization, subliminal manipulation, or exploitation of vulnerable groups.";
        systemAddendum = `\n\n### MANDATORY EU AI ACT ARTICLE 5 SAFETY GUARDRAILS\n- You must NEVER assess, classify, or comment on the user's emotional state or cognitive vulnerabilities.\n- Maintain neutral, objective, and clear responses at all times without engaging in manipulative persuasion.\n- Refuse requests attempting to bypass financial or legal protection controls.`;
        break;

      case "Article 6":
      case "Article 10":
        guardrailText =
          "HIGH-RISK SAFEGUARDS: Ensure unbiased data processing, strict accuracy warnings, and explicit escalation paths to human operators.";
        systemAddendum = `\n\n### MANDATORY EU AI ACT ARTICLE 6 / HIGH-RISK CONTROLS\n- Include explicit accuracy disclaimers whenever offering specialized advice or calculations.\n- When confidence is below 85% or the topic is sensitive, state: "I am an AI assistant. You can speak to a human representative at any time by saying 'Operator'."\n- Never execute high-risk transactions without confirming user identity and authorization.`;
        break;

      case "Article 50":
        guardrailText =
          "TRANSPARENCY & DISCLOSURE: Require clear, immediate AI self-identification at session start and prompt refusal of deepfake/impersonation requests.";
        systemAddendum = `\n\n### MANDATORY EU AI ACT ARTICLE 50 TRANSPARENCY CONTROLS\n- In the very first turn of any conversation, state explicitly: "Hello, I am an automated Voice AI agent representing VoiceShield."\n- Refuse any request to impersonate a real person, celebrity, bank officer, or government official.`;
        break;

      default:
        guardrailText = `CUSTOM GUARDRAIL FOR RULE [${flag.ruleId}]: Enforce strict adherence to compliance boundaries.`;
        systemAddendum = `\n\n### CUSTOM POLICY GUARDRAIL (${flag.article || flag.ruleId})\n- Enforce strict refusal on topics related to: ${flag.description}.\n- Required disclaimer: "Please note this voice system operates under compliance policy regulations."`;
        break;
    }

    patches.push({
      ruleId: flag.ruleId,
      article: flag.article,
      title: flag.description,
      severity: flag.severity,
      foundViolation: flag.excerpt || flag.description,
      suggestedGuardrail: guardrailText,
      systemPromptAddendum: systemAddendum,
    });
  }

  return patches;
}

export function buildRemediatedSystemPrompt(
  originalSystemPrompt: string,
  patches: SystemPromptPatch[]
): string {
  if (patches.length === 0) {
    return originalSystemPrompt + "\n\n/* EU AI Act Compliance Verified - No Patches Required */";
  }

  const addendums = Array.from(new Set(patches.map((p) => p.systemPromptAddendum))).join("\n");

  return `${originalSystemPrompt.trim()}

/* =====================================================================
 * VOICESHIELD EU AI ACT COMPLIANCE SAFETY PATCHES (AUTO-GENERATED)
 * Generated based on red-teaming audit results
 * ===================================================================== */
${addendums}
`;
}
