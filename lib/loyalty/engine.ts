import type { SupabaseClient } from "@supabase/supabase-js";
import type { Order, Reward } from "@/lib/supabase/types";
import { getCustomer, updateCustomerLoyalty } from "@/lib/db/customers";
import { getMembershipTier, getTierForSpend } from "@/lib/db/membershipTiers";
import { createLoyaltyTransaction } from "@/lib/db/loyaltyTransactions";
import { getOrder, applyPointsRedemptionToOrder } from "@/lib/db/orders";

// Called exactly once, when an order transitions to 'paid' (see
// app/dashboard/orders/actions.ts). Awards points at the customer's
// *current* tier multiplier, then re-evaluates lifetime spend against
// the tenant's tiers and upgrades if warranted — tiers are fully
// automatic, no manual override.
export async function awardPointsForOrder(db: SupabaseClient, order: Order): Promise<void> {
  const customer = await getCustomer(db, order.customer_id);
  if (!customer) return;

  const currentTier = customer.membership_tier_id
    ? await getMembershipTier(db, customer.membership_tier_id)
    : null;
  const multiplier = currentTier ? Number(currentTier.point_multiplier) : 1;
  const pointsEarned = Math.floor(Number(order.total_amount) * multiplier);

  const newTotalSpent = Number(customer.total_spent) + Number(order.total_amount);
  const newPoints = customer.loyalty_points + pointsEarned;
  const newTier = await getTierForSpend(db, order.tenant_id, newTotalSpent);

  await createLoyaltyTransaction(db, {
    tenant_id: order.tenant_id,
    customer_id: customer.id,
    type: "earn",
    points: pointsEarned,
    reason: `Order #${order.id.slice(0, 8)}`,
    order_id: order.id,
  });

  await updateCustomerLoyalty(db, customer.id, {
    loyalty_points: newPoints,
    total_spent: newTotalSpent,
    membership_tier_id: newTier?.id ?? null,
  });
}

export type RedeemResult = { ok: true; remainingPoints: number } | { ok: false; reason: string };

export async function redeemReward(
  db: SupabaseClient,
  tenant_id: string,
  customer_id: string,
  reward: Reward
): Promise<RedeemResult> {
  const customer = await getCustomer(db, customer_id);
  if (!customer) return { ok: false, reason: "Customer not found" };
  if (!reward.is_active) return { ok: false, reason: `"${reward.name}" is no longer available` };
  if (customer.loyalty_points < reward.points_cost) {
    return {
      ok: false,
      reason: `Not enough points — needs ${reward.points_cost}, has ${customer.loyalty_points}`,
    };
  }

  const remainingPoints = customer.loyalty_points - reward.points_cost;

  await createLoyaltyTransaction(db, {
    tenant_id,
    customer_id,
    type: "redeem",
    points: -reward.points_cost,
    reason: `Redeemed: ${reward.name}`,
    reward_id: reward.id,
  });

  await updateCustomerLoyalty(db, customer_id, {
    loyalty_points: remainingPoints,
    total_spent: customer.total_spent,
    membership_tier_id: customer.membership_tier_id,
  });

  return { ok: true, remainingPoints };
}

// No per-tenant conversion rate exists anywhere in this app yet — this
// is a documented placeholder (10 points = 1 currency unit), not derived
// from any tenant's actual program. Flag to the user if a real
// tenant-configurable rate is wanted.
export const POINTS_TO_CURRENCY_RATE = 0.1;

export type RedeemPointsResult =
  | { ok: true; remainingPoints: number; discountAmount: number; order: Order }
  | { ok: false; reason: string };

// Distinct from redeemReward above: that one exchanges points for a
// catalog Reward at any time; this applies points as a straight
// discount to an order that already exists — per the blueprint's own
// tool signature (member_id, points, order_id), redeem_points is a
// checkout-time action on a real pending order, not a standalone
// exchange. Guards against redeeming on someone else's order or one
// that's already been paid (no refund flow exists to unwind that).
export async function redeemPointsForOrderDiscount(
  db: SupabaseClient,
  tenant_id: string,
  customer_id: string,
  order_id: string,
  points: number
): Promise<RedeemPointsResult> {
  if (!Number.isFinite(points) || points <= 0) return { ok: false, reason: "Points must be a positive number" };

  const customer = await getCustomer(db, customer_id);
  if (!customer) return { ok: false, reason: "Customer not found" };
  if (customer.loyalty_points < points) {
    return { ok: false, reason: `Not enough points — asked to redeem ${points}, has ${customer.loyalty_points}` };
  }

  const order = await getOrder(db, order_id);
  if (!order) return { ok: false, reason: "Order not found" };
  if (order.tenant_id !== tenant_id || order.customer_id !== customer_id) {
    return { ok: false, reason: "That order does not belong to this customer" };
  }
  if (order.status !== "pending") {
    return { ok: false, reason: "Points can only be redeemed on a pending order" };
  }

  const discountAmount = Math.min(Number(order.total_amount), Math.round(points * POINTS_TO_CURRENCY_RATE * 100) / 100);
  const remainingPoints = customer.loyalty_points - points;

  await createLoyaltyTransaction(db, {
    tenant_id,
    customer_id,
    type: "redeem",
    points: -points,
    reason: `Redeemed at checkout — order #${order.id.slice(0, 8)}`,
    order_id: order.id,
  });
  await updateCustomerLoyalty(db, customer_id, {
    loyalty_points: remainingPoints,
    total_spent: customer.total_spent,
    membership_tier_id: customer.membership_tier_id,
  });
  const updatedOrder = await applyPointsRedemptionToOrder(db, order_id, points, discountAmount);

  return { ok: true, remainingPoints, discountAmount, order: updatedOrder };
}
