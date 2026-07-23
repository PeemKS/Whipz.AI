import type { SupabaseClient } from "@supabase/supabase-js";
import type { Order, OrderItem, OrderStatus } from "@/lib/supabase/types";

export async function getOrder(db: SupabaseClient, id: string): Promise<Order | null> {
  const { data, error } = await db.from("orders").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Order | null;
}

export async function updateOrderStatus(db: SupabaseClient, id: string, status: OrderStatus): Promise<Order> {
  const { data, error } = await db
    .from("orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Order;
}

export async function listOrders(
  db: SupabaseClient,
  tenant_id: string
): Promise<(Order & { customer_display_name: string | null })[]> {
  const { data, error } = await db
    .from("orders")
    .select("*, customers(display_name)")
    .eq("tenant_id", tenant_id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as Array<Order & { customers: { display_name: string | null } | null }>).map((o) => ({
    ...o,
    customer_display_name: o.customers?.display_name ?? null,
  }));
}

export async function listOrdersForCustomer(db: SupabaseClient, customer_id: string): Promise<Order[]> {
  const { data, error } = await db
    .from("orders")
    .select("*")
    .eq("customer_id", customer_id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Order[];
}

export async function createOrder(
  db: SupabaseClient,
  tenant_id: string,
  customer_id: string,
  items: OrderItem[],
  discount?: { promo_term_id: string; discount_amount: number }
): Promise<Order> {
  const rawTotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const total_amount = Math.max(0, rawTotal - (discount?.discount_amount ?? 0));
  const { data, error } = await db
    .from("orders")
    .insert({
      tenant_id,
      customer_id,
      items,
      total_amount,
      status: "pending",
      promo_term_id: discount?.promo_term_id ?? null,
      discount_amount: discount?.discount_amount ?? 0,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Order;
}

// Reduces an EXISTING order's total by a points-redemption value — per
// the blueprint, redeem_points operates on an already-created order
// (checkout-time), unlike apply_promo which is validated before the
// order exists. Floors at 0; doesn't touch discount_amount (that field
// is promo-specific) — points_redeemed is the separate, additive record.
export async function applyPointsRedemptionToOrder(db: SupabaseClient, order_id: string, points: number, valueAmount: number): Promise<Order> {
  const order = await getOrder(db, order_id);
  if (!order) throw new Error(`Order ${order_id} not found`);
  const { data, error } = await db
    .from("orders")
    .update({
      total_amount: Math.max(0, Number(order.total_amount) - valueAmount),
      points_redeemed: order.points_redeemed + points,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order_id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Order;
}
