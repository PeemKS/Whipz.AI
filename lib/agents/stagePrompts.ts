import type { LifecycleStage } from "@/lib/supabase/types";

// The blueprint's funnel stages (Awareness/Consideration/Conversion/
// Retention) and lib/lifecycle/stage.ts's lifecycle stages (lead/new/
// active/at_risk/churned/won_back) are two different axes the blueprint
// never actually reconciles — one is "where is this person in the
// buying journey", the other is "how healthy is this existing
// relationship". This maps lifecycle → funnel stage with an explicit,
// documented interpretation rather than pretending they're the same
// thing:
//   - "lead" (never purchased): Awareness on their very first message
//     ever, Consideration after that — they've engaged but still
//     haven't bought.
//   - "new" (converted within the last 30 days): Conversion — still in
//     the active buying window, the goal is completing/reinforcing that
//     first purchase, not "nurturing" or "retaining" yet.
//   - everything else (active/at_risk/churned/won_back): Retention —
//     they have purchase history; the job now is support, reorder,
//     cross-sell, and loyalty engagement.
export type FunnelStage = "awareness" | "consideration" | "conversion" | "retention";

export function funnelStageForLifecycle(lifecycleStage: LifecycleStage, isFirstMessageEver: boolean): FunnelStage {
  if (lifecycleStage === "lead") return isFirstMessageEver ? "awareness" : "consideration";
  if (lifecycleStage === "new") return "conversion";
  return "retention";
}

const STAGE_GOALS: Record<FunnelStage, string> = {
  awareness: [
    "Stage: Awareness — this is a brand-new contact with no purchase history.",
    "Goal: be helpful and educational, understand what they're looking for, and naturally capture their contact details if the conversation allows it.",
    "Do not apply pricing pressure or lead with discounts — it's too early for that and reads as pushy.",
  ].join(" "),
  consideration: [
    "Stage: Consideration — they've engaged before but haven't purchased yet.",
    "Goal: understand their budget, timeline, and use case; help them compare relevant products.",
    "Honest scarcity is fine if it's true (e.g. genuinely low stock) — never invent urgency.",
  ].join(" "),
  conversion: [
    "Stage: Conversion — they converted recently and are still in an active buying window.",
    "Goal: help them complete or extend the purchase smoothly — reserve stock if they're deciding, apply an approved promo code if they have one, offer loyalty enrollment.",
    "Never invent a discount, hold time, or term that isn't from an approved tool result.",
  ].join(" "),
  retention: [
    "Stage: Retention — this customer has purchase history with us.",
    "Goal: be genuinely helpful on support questions, suggest a reorder if it's about time based on their usual pattern, cross-sell compatible items where relevant, and reinforce their loyalty status/progress.",
  ].join(" "),
};

export function stageGoalBlock(stage: FunnelStage): string {
  return STAGE_GOALS[stage];
}

// Appended to the system prompt only when escalation.ts flags the turn
// — deliberately not a different model (this app has exactly one
// configured model per tenant), just a different, more careful
// instruction layer plus (see runConversationTurn.ts) a longer history
// window.
export function escalationInstructionBlock(reasons: string[]): string {
  return [
    "This conversation needs extra care right now — flagged for: " + reasons.join(", ") + ".",
    "Slow down. Be thorough and empathetic rather than efficient. Don't rush to close or upsell.",
    "If you can't fully resolve this yourself, say so plainly and offer to connect them with a team member rather than guessing.",
  ].join(" ");
}
