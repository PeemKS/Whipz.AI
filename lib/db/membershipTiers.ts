import type { SupabaseClient } from "@supabase/supabase-js";
import type { MembershipTier } from "@/lib/supabase/types";

export async function listMembershipTiers(db: SupabaseClient, tenant_id: string): Promise<MembershipTier[]> {
  const { data, error } = await db
    .from("membership_tiers")
    .select("*")
    .eq("tenant_id", tenant_id)
    .order("min_spend", { ascending: true });
  if (error) throw error;
  return data as MembershipTier[];
}

export async function getMembershipTier(db: SupabaseClient, id: string): Promise<MembershipTier | null> {
  const { data, error } = await db.from("membership_tiers").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as MembershipTier | null;
}

// The highest tier whose min_spend the given lifetime spend qualifies
// for, or null if the tenant hasn't configured any tiers yet.
export async function getTierForSpend(
  db: SupabaseClient,
  tenant_id: string,
  totalSpend: number
): Promise<MembershipTier | null> {
  const tiers = await listMembershipTiers(db, tenant_id);
  const qualifying = tiers.filter((t) => Number(t.min_spend) <= totalSpend);
  if (qualifying.length === 0) return null;
  return qualifying.reduce((best, t) => (Number(t.min_spend) > Number(best.min_spend) ? t : best));
}

export async function createMembershipTier(
  db: SupabaseClient,
  input: { tenant_id: string; name: string; min_spend: number; point_multiplier: number; perks?: string }
): Promise<MembershipTier> {
  const { data, error } = await db.from("membership_tiers").insert(input).select("*").single();
  if (error) throw error;
  return data as MembershipTier;
}

export async function deleteMembershipTier(db: SupabaseClient, id: string): Promise<void> {
  const { error } = await db.from("membership_tiers").delete().eq("id", id);
  if (error) throw error;
}
