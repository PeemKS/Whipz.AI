import type { Order } from "@/lib/supabase/types";

const MS_PER_DAY = 86_400_000;

// A customer with only one order has no observed gap to measure — this
// is what "usual repurchase interval" falls back to for them (and for
// anyone whose real average would be computed from too little history).
// Tunable; 30 days is a reasonable general-retail default, not derived
// from this tenant's actual data.
export const DEFAULT_REPURCHASE_INTERVAL_DAYS = 30;

function daysBetween(a: string, b: Date): number {
  return (b.getTime() - new Date(a).getTime()) / MS_PER_DAY;
}

function paidSortedByDate(orders: Order[]): Order[] {
  return orders.filter((o) => o.status === "paid").sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

// Average days between consecutive paid orders for one customer. null
// if there isn't at least one gap to measure (0 or 1 paid orders).
export function computeAvgRepurchaseIntervalDays(orders: Order[]): number | null {
  const paid = paidSortedByDate(orders);
  if (paid.length < 2) return null;

  let totalGapDays = 0;
  for (let i = 1; i < paid.length; i++) {
    totalGapDays += daysBetween(paid[i - 1].created_at, new Date(paid[i].created_at));
  }
  return totalGapDays / (paid.length - 1);
}

// Per-category breakdown (blueprint: "avg days between orders, per
// customer and per product category"). Categories come from each
// order's line-item SKUs resolved against a sku->category map the
// caller supplies (orders only store sku/qty/price, not category).
export function computeAvgRepurchaseIntervalByCategory(
  orders: Order[],
  skuToCategory: Map<string, string | null>
): Map<string, number> {
  const paid = paidSortedByDate(orders);
  const datesByCategory = new Map<string, Date[]>();

  for (const order of paid) {
    const categories = new Set(order.items.map((item) => skuToCategory.get(item.sku) ?? "uncategorized"));
    for (const category of categories) {
      const list = datesByCategory.get(category) ?? [];
      list.push(new Date(order.created_at));
      datesByCategory.set(category, list);
    }
  }

  const result = new Map<string, number>();
  for (const [category, dates] of datesByCategory) {
    if (dates.length < 2) continue;
    dates.sort((a, b) => a.getTime() - b.getTime());
    let totalGapDays = 0;
    for (let i = 1; i < dates.length; i++) {
      totalGapDays += (dates[i].getTime() - dates[i - 1].getTime()) / MS_PER_DAY;
    }
    result.set(category, totalGapDays / (dates.length - 1));
  }
  return result;
}
