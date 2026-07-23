"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerAuth } from "@/lib/supabase/serverAuth";
import { createMembershipTier, deleteMembershipTier } from "@/lib/db/membershipTiers";
import { createReward, updateReward, deleteReward } from "@/lib/db/rewards";

export async function createTierAction(formData: FormData) {
  const tenant_id = String(formData.get("tenant_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const min_spend = Number(formData.get("min_spend") ?? 0);
  const point_multiplier = Number(formData.get("point_multiplier") ?? 1);
  const perks = String(formData.get("perks") ?? "").trim() || undefined;
  if (!tenant_id || !name) return;

  const db = await supabaseServerAuth();
  await createMembershipTier(db, { tenant_id, name, min_spend, point_multiplier, perks });
  revalidatePath("/dashboard/loyalty");
}

export async function deleteTierAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const db = await supabaseServerAuth();
  await deleteMembershipTier(db, id);
  revalidatePath("/dashboard/loyalty");
}

export async function createRewardAction(formData: FormData) {
  const tenant_id = String(formData.get("tenant_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || undefined;
  const points_cost = Number(formData.get("points_cost") ?? 0);
  if (!tenant_id || !name || points_cost <= 0) return;

  const db = await supabaseServerAuth();
  await createReward(db, { tenant_id, name, description, points_cost });
  revalidatePath("/dashboard/loyalty");
}

export async function toggleRewardActiveAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const is_active = formData.get("is_active") === "true";
  if (!id) return;
  const db = await supabaseServerAuth();
  await updateReward(db, id, { is_active: !is_active });
  revalidatePath("/dashboard/loyalty");
}

export async function deleteRewardAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const db = await supabaseServerAuth();
  await deleteReward(db, id);
  revalidatePath("/dashboard/loyalty");
}
