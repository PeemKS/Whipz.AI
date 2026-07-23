import type { SupabaseClient } from "@supabase/supabase-js";
import type { StockHold } from "@/lib/supabase/types";

// Schema-only in Phase 1 — nothing creates holds yet (that's the
// reserve_stock tool, a later phase). These helpers exist now so that
// tool has a ready-made, already-tested data layer to call into rather
// than inventing one under time pressure later.

export async function createStockHold(
  db: SupabaseClient,
  input: {
    tenant_id: string;
    product_id: string;
    qty: number;
    customer_id?: string | null;
    conversation_id?: string | null;
    holdMinutes: number;
  }
): Promise<StockHold> {
  const expires_at = new Date(Date.now() + input.holdMinutes * 60_000).toISOString();
  const { data, error } = await db
    .from("stock_holds")
    .insert({
      tenant_id: input.tenant_id,
      product_id: input.product_id,
      qty: input.qty,
      customer_id: input.customer_id ?? null,
      conversation_id: input.conversation_id ?? null,
      expires_at,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as StockHold;
}

// Sum of qty across active, unexpired holds for a product — subtract
// this from products.stock to get what's actually available to sell.
export async function sumActiveHolds(db: SupabaseClient, product_id: string): Promise<number> {
  const { data, error } = await db
    .from("stock_holds")
    .select("qty")
    .eq("product_id", product_id)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString());
  if (error) throw error;
  return (data as { qty: number }[]).reduce((sum, row) => sum + row.qty, 0);
}

export async function availableStock(db: SupabaseClient, product_id: string, rawStock: number): Promise<number> {
  const held = await sumActiveHolds(db, product_id);
  return Math.max(0, rawStock - held);
}

export async function releaseStockHold(db: SupabaseClient, id: string): Promise<void> {
  const { error } = await db.from("stock_holds").update({ status: "released" }).eq("id", id).eq("status", "active");
  if (error) throw error;
}

// Called right after create_order fulfills a SKU a customer had held —
// without this, availableStock would double-subtract: once for the
// hold (still 'active') and again for the real stock decrement
// create_order already did.
export async function consumeActiveHoldsForCustomerProduct(db: SupabaseClient, product_id: string, customer_id: string): Promise<void> {
  const { error } = await db
    .from("stock_holds")
    .update({ status: "consumed" })
    .eq("product_id", product_id)
    .eq("customer_id", customer_id)
    .eq("status", "active");
  if (error) throw error;
}

export async function consumeStockHold(db: SupabaseClient, id: string): Promise<void> {
  const { error } = await db.from("stock_holds").update({ status: "consumed" }).eq("id", id).eq("status", "active");
  if (error) throw error;
}

// For an optional cleanup sweep (reporting tidiness only — correctness
// never depends on this running, since sumActiveHolds already filters
// on expires_at itself).
export async function listExpiredActiveHolds(db: SupabaseClient): Promise<StockHold[]> {
  const { data, error } = await db
    .from("stock_holds")
    .select("*")
    .eq("status", "active")
    .lt("expires_at", new Date().toISOString());
  if (error) throw error;
  return data as StockHold[];
}
