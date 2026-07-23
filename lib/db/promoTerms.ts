import type { SupabaseClient } from "@supabase/supabase-js";
import type { PromoTerm } from "@/lib/supabase/types";

export async function listPromoTerms(db: SupabaseClient, tenant_id: string): Promise<PromoTerm[]> {
  const { data, error } = await db
    .from("promo_terms")
    .select("*")
    .eq("tenant_id", tenant_id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as PromoTerm[];
}

export async function createPromoTerm(
  db: SupabaseClient,
  input: {
    tenant_id: string;
    code: string;
    discount_type: "percent" | "fixed";
    discount_value: number;
    max_uses_per_customer?: number | null;
    min_order_amount?: number | null;
  }
): Promise<PromoTerm> {
  const { data, error } = await db.from("promo_terms").insert(input).select("*").single();
  if (error) throw error;
  return data as PromoTerm;
}

export async function setPromoTermActive(db: SupabaseClient, id: string, active: boolean): Promise<void> {
  const { error } = await db.from("promo_terms").update({ active, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function deletePromoTerm(db: SupabaseClient, id: string): Promise<void> {
  const { error } = await db.from("promo_terms").delete().eq("id", id);
  if (error) throw error;
}

// Case-insensitive on purpose — matches the tenant-scoped unique index
// (lower(code)), since customers won't reliably type a code's exact case.
export async function getActivePromoTermByCode(db: SupabaseClient, tenant_id: string, code: string): Promise<PromoTerm | null> {
  const { data, error } = await db
    .from("promo_terms")
    .select("*")
    .eq("tenant_id", tenant_id)
    .ilike("code", code)
    .eq("active", true)
    .maybeSingle();
  if (error) throw error;
  return data as PromoTerm | null;
}

export async function countCustomerPromoRedemptions(db: SupabaseClient, promo_term_id: string, customer_id: string): Promise<number> {
  const { count, error } = await db
    .from("promo_redemptions")
    .select("id", { count: "exact", head: true })
    .eq("promo_term_id", promo_term_id)
    .eq("customer_id", customer_id);
  if (error) throw error;
  return count ?? 0;
}

export async function createPromoRedemption(
  db: SupabaseClient,
  input: { tenant_id: string; promo_term_id: string; customer_id: string; order_id: string; discount_amount: number }
): Promise<void> {
  const { error } = await db.from("promo_redemptions").insert(input);
  if (error) throw error;
}

export interface PromoValidationResult {
  ok: boolean;
  reason?: string;
  discountAmount?: number;
  promoTerm?: PromoTerm;
}

// Pure validate-and-quote — no writes. Used by both the apply_promo tool
// (a customer asking "does this code work?" before committing to
// anything) and create_order (re-validated at the moment it actually
// matters, since time/usage may have moved between the two calls).
export async function validatePromoCode(
  db: SupabaseClient,
  tenant_id: string,
  customer_id: string,
  code: string,
  orderTotal: number
): Promise<PromoValidationResult> {
  const term = await getActivePromoTermByCode(db, tenant_id, code);
  if (!term) return { ok: false, reason: `No active promo code "${code}" found` };

  if (term.min_order_amount != null && orderTotal < Number(term.min_order_amount)) {
    return { ok: false, reason: `Order total must be at least ${term.min_order_amount} to use this code` };
  }

  if (term.max_uses_per_customer != null) {
    const used = await countCustomerPromoRedemptions(db, term.id, customer_id);
    if (used >= term.max_uses_per_customer) {
      return { ok: false, reason: "This customer has already used this promo code the maximum number of times" };
    }
  }

  const discountAmount =
    term.discount_type === "percent" ? Math.round(orderTotal * (Number(term.discount_value) / 100) * 100) / 100 : Number(term.discount_value);

  return { ok: true, discountAmount: Math.min(discountAmount, orderTotal), promoTerm: term };
}
