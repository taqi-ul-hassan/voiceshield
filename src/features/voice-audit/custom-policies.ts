import { PolicyRule } from "./types";

export interface CustomPolicyRule extends PolicyRule {
  isCustom?: boolean;
  category?: "custom_guardrail" | "financial_disclaimer" | "hipaa_privacy" | "custom_brand";
}

const CUSTOM_POLICIES_KEY = "voiceshield:custom-policies:v1";

export function getCustomPolicies(): CustomPolicyRule[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_POLICIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomPolicy(policy: CustomPolicyRule): CustomPolicyRule[] {
  const current = getCustomPolicies().filter((p) => p.id !== policy.id);
  const updated = [policy, ...current];
  localStorage.setItem(CUSTOM_POLICIES_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event("voiceshield:custom-policies-changed"));
  return updated;
}

export function deleteCustomPolicy(policyId: string): CustomPolicyRule[] {
  const updated = getCustomPolicies().filter((p) => p.id !== policyId);
  localStorage.setItem(CUSTOM_POLICIES_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event("voiceshield:custom-policies-changed"));
  return updated;
}
