import type { Order } from "@/lib/supabase/types";

const MS_PER_DAY = 86_400_000;

// The blueprint's literal formula (CLV = AOV × frequency/yr ×
// lifespan-yrs) is tautological if frequency and lifespan are both
// derived from the same historical order window: frequency/yr =
// count / lifespanYears, so AOV × (count/lifespanYears) × lifespanYears
// collapses to AOV × count, i.e. exactly total_spent — not a projection,
// just restating money already spent. A useful CLV has to project
// forward: this uses the customer's own observed order frequency, but
// multiplies by an assumed FUTURE lifespan rather than their elapsed
// one. 3 years is a common retail/SaaS default — tune per business via
// the `assumedLifespanYears` param once there's a real reason to.
const DEFAULT_ASSUMED_LIFESPAN_YEARS = 3;

// Guards against a same-day or near-simultaneous multi-order customer
// implying an absurd frequency (e.g. 2 orders one day apart reading as
// "365/year") — floor the observed window before dividing.
const MIN_OBSERVED_WINDOW_DAYS = 30;

export function computeClv(orders: Order[], assumedLifespanYears = DEFAULT_ASSUMED_LIFESPAN_YEARS): number {
  const paid = orders.filter((o) => o.status === "paid");
  if (paid.length === 0) return 0;

  const totalSpent = paid.reduce((sum, o) => sum + Number(o.total_amount), 0);
  const aov = totalSpent / paid.length;

  if (paid.length === 1) {
    // No observed gap at all — project a conservative single order per
    // year rather than guessing at a frequency from one data point.
    return aov * 1 * assumedLifespanYears;
  }

  const dates = paid.map((o) => new Date(o.created_at).getTime()).sort((a, b) => a - b);
  const observedWindowDays = Math.max((dates[dates.length - 1] - dates[0]) / MS_PER_DAY, MIN_OBSERVED_WINDOW_DAYS);
  const frequencyPerYear = paid.length / (observedWindowDays / 365);

  return aov * frequencyPerYear * assumedLifespanYears;
}

export interface ClvSummary {
  avgClv: number;
  avgClvMembers: number;
  avgClvNonMembers: number;
}

// Tenant-wide summary split by membership status — the blueprint calls
// this out specifically because the members-vs-non-members gap is what
// makes the case for loyalty-program enrollment. Split on explicit
// loyalty_opt_in (Phase 3's enroll_member), not membership_tier_id —
// tier assignment is automatic by spend and doesn't mean someone
// actually opted into the program.
export function summarizeClv(
  customers: { id: string; loyalty_opt_in: boolean }[],
  ordersByCustomer: Map<string, Order[]>,
  assumedLifespanYears = DEFAULT_ASSUMED_LIFESPAN_YEARS
): ClvSummary {
  const members: number[] = [];
  const nonMembers: number[] = [];

  for (const customer of customers) {
    const clv = computeClv(ordersByCustomer.get(customer.id) ?? [], assumedLifespanYears);
    (customer.loyalty_opt_in ? members : nonMembers).push(clv);
  }

  const avg = (values: number[]) => (values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0);
  return {
    avgClv: avg([...members, ...nonMembers]),
    avgClvMembers: avg(members),
    avgClvNonMembers: avg(nonMembers),
  };
}
