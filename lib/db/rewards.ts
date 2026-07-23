import type { SupabaseClient } from "@supabase/supabase-js";
import type { Reward } from "@/lib/supabase/types";

export async function listRewards(db: SupabaseClient, tenant_id: string): Promise<Reward[]> {
  const { data, error } = await db
    .from("rewards")
    .select("*")
    .eq("tenant_id", tenant_id)
    .order("points_cost", { ascending: true });
  if (error) throw error;
  return data as Reward[];
}

export async function listActiveRewards(db: SupabaseClient, tenant_id: string): Promise<Reward[]> {
  const { data, error } = await db
    .from("rewards")
    .select("*")
    .eq("tenant_id", tenant_id)
    .eq("is_active", true)
    .order("points_cost", { ascending: true });
  if (error) throw error;
  return data as Reward[];
}

export async function createReward(
  db: SupabaseClient,
  input: { tenant_id: string; name: string; description?: string; points_cost: number }
): Promise<Reward> {
  const { data, error } = await db.from("rewards").insert(input).select("*").single();
  if (error) throw error;
  return data as Reward;
}

export async function updateReward(
  db: SupabaseClient,
  id: string,
  input: Partial<Pick<Reward, "name" | "description" | "points_cost" | "is_active">>
): Promise<Reward> {
  const { data, error } = await db
    .from("rewards")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Reward;
}

export async function deleteReward(db: SupabaseClient, id: string): Promise<void> {
  const { error } = await db.from("rewards").delete().eq("id", id);
  if (error) throw error;
}
