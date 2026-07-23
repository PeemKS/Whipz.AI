import type { Customer, Order, RfmSegment } from "@/lib/supabase/types";

export interface RfmScore {
  customer_id: string;
  recency: number; // 1-5, 5 = most recently active
  frequency: number; // 1-5, 5 = most orders
  monetary: number; // 1-5, 5 = highest lifetime spend
  segment: RfmSegment;
}

const MS_PER_DAY = 86_400_000;

// Quintile rank (1-5) of each value's position within the whole set,
// ascending — rank 1 is the lowest raw value, 5 the highest. Relative
// to the tenant's own customer base, per the blueprint ("score each
// customer 1-5... ") — not fixed thresholds, since what counts as
// "frequent" or "high spend" varies enormously by business.
function quintileRanks(values: number[]): number[] {
  const n = values.length;
  const order = values.map((_, i) => i).sort((a, b) => values[a] - values[b]);
  const ranks = new Array<number>(n);
  order.forEach((originalIndex, position) => {
    ranks[originalIndex] = Math.min(5, Math.floor((position / n) * 5) + 1);
  });
  return ranks;
}

// Segment rules from the blueprint's table, checked in priority order
// (most specific/actionable combos first) since a customer can satisfy
// more than one loosely-stated rule at once. Anything matching none of
// the five falls into "other" — the blueprint's table isn't exhaustive
// over all 125 R×F×M combinations, and forcing every combination into
// one of five named buckets would misrepresent the middle of the
// distribution as more extreme than it is.
function classifySegment(recency: number, frequency: number, monetary: number): RfmSegment {
  if (recency >= 4 && frequency >= 4 && monetary >= 4) return "champions";
  if (frequency >= 4 && recency >= 3) return "loyal";
  if (recency <= 2 && monetary >= 4) return "at_risk_big_spenders";
  if (recency >= 4 && frequency <= 2) return "promising";
  if (recency <= 2 && frequency <= 2 && monetary <= 2) return "hibernating";
  return "other";
}

// Only scores customers with at least one paid order — RFM is
// inherently about existing purchase behavior; a lead with zero orders
// has no recency/frequency/monetary signal to rank.
export function computeRfmForTenant(
  customers: Pick<Customer, "id">[],
  ordersByCustomer: Map<string, Order[]>,
  now: Date = new Date()
): RfmScore[] {
  const withOrders = customers
    .map((c) => ({ customer: c, paid: (ordersByCustomer.get(c.id) ?? []).filter((o) => o.status === "paid") }))
    .filter((row) => row.paid.length > 0);

  if (withOrders.length === 0) return [];

  const recencyDays = withOrders.map((row) => {
    const lastOrderMs = Math.max(...row.paid.map((o) => new Date(o.created_at).getTime()));
    return (now.getTime() - lastOrderMs) / MS_PER_DAY;
  });
  const frequency = withOrders.map((row) => row.paid.length);
  const monetary = withOrders.map((row) => row.paid.reduce((sum, o) => sum + Number(o.total_amount), 0));

  // Lower days-since-last-order is better, so invert the raw quintile.
  const recencyRanks = quintileRanks(recencyDays).map((rank) => 6 - rank);
  const frequencyRanks = quintileRanks(frequency);
  const monetaryRanks = quintileRanks(monetary);

  return withOrders.map((row, i) => ({
    customer_id: row.customer.id,
    recency: recencyRanks[i],
    frequency: frequencyRanks[i],
    monetary: monetaryRanks[i],
    segment: classifySegment(recencyRanks[i], frequencyRanks[i], monetaryRanks[i]),
  }));
}
