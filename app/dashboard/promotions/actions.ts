"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerAuth } from "@/lib/supabase/serverAuth";
import { createPromotion, setPromotionOverride, deletePromotion } from "@/lib/db/promotions";
import { createPromoTerm, setPromoTermActive, deletePromoTerm } from "@/lib/db/promoTerms";

export async function createPromotionAction(formData: FormData) {
  const tenant_id = String(formData.get("tenant_id") ?? "");
  const type = String(formData.get("type") ?? "").trim();
  const start_at = String(formData.get("start_at") ?? "");
  const end_at = String(formData.get("end_at") ?? "");
  if (!tenant_id || !type || !start_at || !end_at) return;

  const product_id = String(formData.get("product_id") ?? "").trim() || null;
  const priorityRaw = String(formData.get("priority") ?? "").trim();
  const priority = priorityRaw ? Number(priorityRaw) : undefined;
  const stackable = formData.get("stackable") === "on";

  const db = await supabaseServerAuth();
  await createPromotion(db, {
    tenant_id,
    type,
    start_at: new Date(start_at).toISOString(),
    end_at: new Date(end_at).toISOString(),
    product_id,
    priority,
    stackable,
  });
  revalidatePath("/dashboard/promotions");
}

export async function setPromotionActiveAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  // Checkboxes are only present in FormData when checked, so absence means off.
  const active = formData.get("active") === "on";
  const db = await supabaseServerAuth();
  await setPromotionOverride(db, id, active ? null : "paused");
  revalidatePath("/dashboard/promotions");
}

export async function deletePromotionAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const db = await supabaseServerAuth();
  await deletePromotion(db, id);
  revalidatePath("/dashboard/promotions");
}

export async function createPromoTermAction(formData: FormData) {
  const tenant_id = String(formData.get("tenant_id") ?? "");
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const discount_type = String(formData.get("discount_type") ?? "");
  const discount_value = Number(formData.get("discount_value") ?? 0);
  if (!tenant_id || !code || (discount_type !== "percent" && discount_type !== "fixed") || !(discount_value > 0)) return;

  const maxUsesRaw = String(formData.get("max_uses_per_customer") ?? "").trim();
  const minOrderRaw = String(formData.get("min_order_amount") ?? "").trim();

  const db = await supabaseServerAuth();
  await createPromoTerm(db, {
    tenant_id,
    code,
    discount_type,
    discount_value,
    max_uses_per_customer: maxUsesRaw ? Number(maxUsesRaw) : null,
    min_order_amount: minOrderRaw ? Number(minOrderRaw) : null,
  });
  revalidatePath("/dashboard/promotions");
}

export async function setPromoTermActiveAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  if (!id) return;
  const db = await supabaseServerAuth();
  await setPromoTermActive(db, id, !active);
  revalidatePath("/dashboard/promotions");
}

export async function deletePromoTermAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const db = await supabaseServerAuth();
  await deletePromoTerm(db, id);
  revalidatePath("/dashboard/promotions");
}
