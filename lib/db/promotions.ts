import type { SupabaseClient } from "@supabase/supabase-js";
import type { Promotion } from "@/lib/supabase/types";

// Promotion "status" reflects the DB's date-driven computation
// (draft/scheduled/active/expired); manual_override lets a merchant
// force it to "paused" or "active" regardless of dates. Mirrors the
// effective-status logic in app/dashboard/promotions/page.tsx.
export async function listActivePromotions(
  db: SupabaseClient,
  tenant_id: string
): Promise<{ type: string; product_name: string | null; end_at: string; stackable: boolean }[]> {
  const { data, error } = await db
    .from("promotions")
    .select("type, end_at, stackable, status, manual_override, products(name)")
    .eq("tenant_id", tenant_id);
  if (error) throw error;

  return (
    data as unknown as {
      type: string;
      end_at: string;
      stackable: boolean;
      status: Promotion["status"];
      manual_override: Promotion["manual_override"];
      products: { name: string } | null;
    }[]
  )
    .filter((p) => (p.manual_override ?? p.status) === "active")
    .map((p) => ({ type: p.type, product_name: p.products?.name ?? null, end_at: p.end_at, stackable: p.stackable }));
}

export async function listPromotions(db: SupabaseClient, tenant_id: string): Promise<Promotion[]> {
  const { data, error } = await db
    .from("promotions")
    .select("*")
    .eq("tenant_id", tenant_id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Promotion[];
}

export async function createPromotion(
  db: SupabaseClient,
  input: {
    tenant_id: string;
    product_id?: string | null;
    type: string;
    start_at: string;
    end_at: string;
    priority?: number;
    stackable?: boolean;
  }
): Promise<Promotion> {
  const { data, error } = await db.from("promotions").insert(input).select("*").single();
  if (error) throw error;
  return data as Promotion;
}

export async function setPromotionOverride(
  db: SupabaseClient,
  id: string,
  manual_override: Promotion["status"] | null
): Promise<Promotion> {
  const { data, error } = await db
    .from("promotions")
    .update({ manual_override, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Promotion;
}

export async function deletePromotion(db: SupabaseClient, id: string): Promise<void> {
  const { error } = await db.from("promotions").delete().eq("id", id);
  if (error) throw error;
}
