import type { SupabaseClient } from "@supabase/supabase-js";
import type { LoyaltyTransaction, LoyaltyTransactionType } from "@/lib/supabase/types";

export async function listLoyaltyTransactions(
  db: SupabaseClient,
  customer_id: string,
  limit = 20
): Promise<LoyaltyTransaction[]> {
  const { data, error } = await db
    .from("loyalty_transactions")
    .select("*")
    .eq("customer_id", customer_id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as LoyaltyTransaction[];
}

export async function createLoyaltyTransaction(
  db: SupabaseClient,
  input: {
    tenant_id: string;
    customer_id: string;
    type: LoyaltyTransactionType;
    points: number;
    reason: string;
    order_id?: string | null;
    reward_id?: string | null;
  }
): Promise<LoyaltyTransaction> {
  const { data, error } = await db.from("loyalty_transactions").insert(input).select("*").single();
  if (error) throw error;
  return data as LoyaltyTransaction;
}
