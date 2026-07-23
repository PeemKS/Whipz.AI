import type { Order, LifecycleStage } from "@/lib/supabase/types";
import { computeAvgRepurchaseIntervalDays, DEFAULT_REPURCHASE_INTERVAL_DAYS } from "@/lib/lifecycle/repurchaseCycle";

const MS_PER_DAY = 86_400_000;

// Multipliers straight from the blueprint's table. Judgment calls made
// where the blueprint left gaps or an undefined case:
//   - "New" is evaluated off the FIRST paid order, not the most recent —
//     matches the blueprint's literal wording ("first purchase within
//     last 30 days"), so a customer's very first order keeps them "new"
//     for 30 days even if by coincidence they reorder immediately.
//   - The blueprint's own bands leave a hole between "at-risk" (up to
//     2x) and "churned" (3x+) — (2x, 3x] is undefined. Folded into
//     at-risk here: better to under- than over-flag as churned, since
//     at-risk is the actionable bucket outreach reads from anyway.
//   - Zero paid orders ever isn't one of the blueprint's 5 stages (all
//     of them presume at least one purchase) — modeled as "lead" rather
//     than silently defaulting into one of the five, so a dashboard
//     distribution doesn't misrepresent people who've never bought
//     anything as some flavor of existing customer.
//   - "Won-back" (was churned, then purchased again) is evaluated on the
//     gap immediately BEFORE the customer's most recent order, not their
//     current status — someone who churned, came back, and is now
//     overdue again reads as at-risk/churned again, not permanently
//     "won-back".
const NEW_WINDOW_DAYS = 30;
const ACTIVE_MULTIPLIER = 1.5;
const AT_RISK_MULTIPLIER = 3;

function daysBetween(a: string, b: Date): number {
  return (b.getTime() - new Date(a).getTime()) / MS_PER_DAY;
}

export function computeLifecycleStage(orders: Order[], now: Date = new Date()): LifecycleStage {
  const paid = orders.filter((o) => o.status === "paid").sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  if (paid.length === 0) return "lead";

  const first = paid[0];
  if (daysBetween(first.created_at, now) <= NEW_WINDOW_DAYS) return "new";

  const last = paid[paid.length - 1];
  const avgInterval = computeAvgRepurchaseIntervalDays(paid) ?? DEFAULT_REPURCHASE_INTERVAL_DAYS;
  const daysSinceLast = daysBetween(last.created_at, now);
  const ratioSinceLast = daysSinceLast / avgInterval;

  if (ratioSinceLast <= ACTIVE_MULTIPLIER) {
    // Currently active-by-recency — but check whether the gap leading
    // INTO this most recent order was itself churn-level, i.e. they'd
    // gone quiet and just came back.
    if (paid.length >= 2) {
      const gapBeforeLast = daysBetween(paid[paid.length - 2].created_at, new Date(last.created_at));
      const priorAvgInterval =
        computeAvgRepurchaseIntervalDays(paid.slice(0, -1)) ?? DEFAULT_REPURCHASE_INTERVAL_DAYS;
      if (gapBeforeLast / priorAvgInterval > AT_RISK_MULTIPLIER) return "won_back";
    }
    return "active";
  }

  if (ratioSinceLast <= AT_RISK_MULTIPLIER) return "at_risk";
  return "churned";
}
