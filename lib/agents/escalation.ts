import type { Customer, MembershipTier, Order } from "@/lib/supabase/types";

// Cheap keyword heuristic, not a dedicated LLM call — the blueprint's
// own examples (price objections, "cheaper elsewhere", complaints) are
// linguistically distinctive enough that a call specifically to detect
// them would cost more than the problem it solves. False negatives just
// mean the L2 loop handles it as normal; false positives just mean a
// routine question gets handled a bit more carefully than strictly
// necessary — both fail safe.
const OBJECTION_KEYWORDS = [
  "expensive",
  "too much",
  "cheaper",
  "found it for less",
  "somewhere else",
  "not sure",
  "hesitant",
  "think about it",
];
const COMPLAINT_KEYWORDS = [
  "refund",
  "complain",
  "complaint",
  "angry",
  "upset",
  "disappointed",
  "unacceptable",
  "cancel my order",
  "never arrived",
  "broken",
  "damaged",
  "scam",
  "lawsuit",
  "lawyer",
];

export function containsAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

export interface EscalationContext {
  userMessage: string;
  customer: Customer;
  customerTier: MembershipTier | null;
  tenantTiersBySpendDesc: MembershipTier[]; // sorted highest min_spend first
  pendingOrders: Order[]; // this customer's own pending (uncompleted) orders
  lifecycleStage: string;
  routingWasConfident: boolean;
  v3ThresholdAmount: number;
}

export interface EscalationResult {
  escalate: boolean;
  reasons: string[];
}

// "Would the shop owner handle this personally?" — the blueprint's own
// heuristic, operationalized as a fixed set of checks rather than a
// judgment call, so it's auditable and doesn't cost an extra LLM call.
export function shouldEscalateToL3(ctx: EscalationContext): EscalationResult {
  const reasons: string[] = [];

  if (containsAny(ctx.userMessage, OBJECTION_KEYWORDS)) reasons.push("objection_language");
  if (containsAny(ctx.userMessage, COMPLAINT_KEYWORDS)) reasons.push("complaint_language");

  // "High-value cart" — there's no persistent shopping-cart concept in
  // this app; the closest real, available signal is a pending order
  // this customer already has in flight. A brand new conversation with
  // no pending order never trips this, which is the right default.
  const highestPending = ctx.pendingOrders.reduce((max, o) => Math.max(max, Number(o.total_amount)), 0);
  if (highestPending > ctx.v3ThresholdAmount) reasons.push("high_value_cart");

  // Top-tier customer (by this tenant's own tier ranking, not a fixed
  // "Gold/Platinum" name — tier names are tenant-defined) showing
  // complaint/objection language gets flagged even more specifically.
  const isTopTier =
    ctx.customerTier != null &&
    ctx.tenantTiersBySpendDesc.length > 0 &&
    ctx.customerTier.id === ctx.tenantTiersBySpendDesc[0].id;
  if (isTopTier && (reasons.includes("complaint_language") || reasons.includes("objection_language"))) {
    reasons.push("top_tier_negative_sentiment");
  }

  // Win-back: a lifecycle stage lib/lifecycle/stage.ts already computes
  // — someone who'd gone quiet past the churn threshold and just
  // messaged back in. Worth extra care so they don't slip away again.
  if (ctx.lifecycleStage === "won_back") reasons.push("win_back");

  // Low routing confidence — reuses pickAgent's own embedding-similarity
  // confidence gate (lib/agents/pickAgent.ts) rather than a second
  // classifier: if specialist routing itself couldn't confidently place
  // this message, that's a real signal the situation isn't routine.
  if (!ctx.routingWasConfident) reasons.push("low_routing_confidence");

  return { escalate: reasons.length > 0, reasons };
}
