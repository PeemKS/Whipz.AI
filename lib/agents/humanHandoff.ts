import { containsAny } from "@/lib/agents/escalation";

// Distinct from escalation.ts's L3 triggers: L3 means "same model,
// handle this more carefully"; these mean "stop — a human takes over
// entirely" (funnel-aware-agent blueprint §3, "Human handoff triggers
// (always available, all tiers)"). Both are keyword heuristics for the
// same reason escalation.ts's are: a dedicated classifier call to detect
// "does this need a human" would itself cost more than the problem.
const EXPLICIT_HUMAN_REQUEST_KEYWORDS = [
  "talk to a human",
  "speak to a human",
  "real person",
  "human agent",
  "speak to someone",
  "talk to someone",
  "customer service rep",
  "speak to a manager",
];
const LEGAL_SAFETY_KEYWORDS = [
  "lawsuit",
  "sue you",
  "my lawyer",
  "my attorney",
  "call the police",
  "hurt myself",
  "hurt someone",
  "suicide",
  "emergency",
  "unsafe",
];
const REFUND_DISPUTE_KEYWORDS = ["refund", "dispute", "chargeback", "money back", "charge back"];

export interface HumanHandoffContext {
  userMessage: string;
  consecutiveToolFailures: number;
  mostRecentOrderAmount: number;
  v3ThresholdAmount: number;
}

export interface HumanHandoffResult {
  handoff: boolean;
  reasons: string[];
}

export function checkHumanHandoffTriggers(ctx: HumanHandoffContext): HumanHandoffResult {
  const reasons: string[] = [];

  if (containsAny(ctx.userMessage, EXPLICIT_HUMAN_REQUEST_KEYWORDS)) reasons.push("explicit_request");
  if (containsAny(ctx.userMessage, LEGAL_SAFETY_KEYWORDS)) reasons.push("legal_or_safety");
  if (containsAny(ctx.userMessage, REFUND_DISPUTE_KEYWORDS) && ctx.mostRecentOrderAmount > ctx.v3ThresholdAmount) {
    reasons.push("refund_dispute_above_threshold");
  }
  if (ctx.consecutiveToolFailures >= 2) reasons.push("repeated_tool_failures");

  return { handoff: reasons.length > 0, reasons };
}
