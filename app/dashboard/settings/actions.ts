"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverAuth";
import { updateTenantSettings, uploadTenantLogo } from "@/lib/db/tenants";
import { encryptSecret, decryptSecret } from "@/lib/crypto/tenantKey";
import { vendorForModel, defaultModelFor, testLlmConnection } from "@/lib/llm/client";
import { WEEK_DAYS, type OpeningHours } from "@/lib/supabase/types";

export async function updateProfileAction(formData: FormData) {
  const tenant_id = String(formData.get("tenant_id") ?? "");
  const business_name = String(formData.get("business_name") ?? "").trim();
  if (!tenant_id || !business_name) return;

  const category = String(formData.get("category") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const website = String(formData.get("website") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;

  const opening_hours: OpeningHours = {};
  for (const day of WEEK_DAYS) {
    const closed = formData.get(`hours_${day}_closed`) === "on";
    const open = String(formData.get(`hours_${day}_open`) ?? "");
    const close = String(formData.get(`hours_${day}_close`) ?? "");
    if (closed || open || close) {
      opening_hours[day] = { open, close, closed };
    }
  }

  const db = await supabaseServerAuth();
  await updateTenantSettings(db, tenant_id, {
    business_name,
    category,
    address,
    phone,
    website,
    description,
    opening_hours,
  });

  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    await uploadTenantLogo(db, tenant_id, logo);
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
}

export async function updateLlmSettingsAction(formData: FormData) {
  const tenant_id = String(formData.get("tenant_id") ?? "");
  const llm_model = String(formData.get("llm_model") ?? "").trim();
  const llm_api_key = String(formData.get("llm_api_key") ?? "").trim();
  if (!tenant_id) return;

  const db = await supabaseServerAuth();
  const tenant = await updateTenantSettings(db, tenant_id, {
    llm_provider: "byok",
    llm_model: llm_model || undefined,
    ...(llm_api_key ? { llm_api_key_enc: encryptSecret(llm_api_key) } : {}),
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");

  const vendor = vendorForModel(tenant.llm_model);
  const params = new URLSearchParams({ saved: vendor });
  if (tenant.llm_api_key_enc) {
    // Test the key that's actually in effect now — whichever was just
    // typed, or the one already on file if the field was left blank.
    const result = await testLlmConnection(
      vendor,
      decryptSecret(tenant.llm_api_key_enc),
      tenant.llm_model ?? defaultModelFor(vendor)
    );
    params.set("ok", result.ok ? "1" : "0");
    if (!result.ok) params.set("error", result.error);
  }
  redirect(`/dashboard/settings/llm?${params.toString()}`);
}

export async function updateEscalationThresholdAction(formData: FormData) {
  const tenant_id = String(formData.get("tenant_id") ?? "");
  const raw = String(formData.get("v3_threshold_amount") ?? "").trim();
  const v3_threshold_amount = Number(raw);
  if (!tenant_id || !raw || !Number.isFinite(v3_threshold_amount) || v3_threshold_amount < 0) return;

  const db = await supabaseServerAuth();
  await updateTenantSettings(db, tenant_id, { v3_threshold_amount });
  revalidatePath("/dashboard/settings/llm");
}

export async function updateTokenBudgetAction(formData: FormData) {
  const tenant_id = String(formData.get("tenant_id") ?? "");
  if (!tenant_id) return;
  const raw = String(formData.get("monthly_token_budget") ?? "").trim();

  const db = await supabaseServerAuth();
  // Blank clears the budget (unlimited) — a valid, intentional choice,
  // not a validation failure like the escalation threshold's blank case.
  await updateTenantSettings(db, tenant_id, { monthly_token_budget: raw ? Number(raw) : null });
  revalidatePath("/dashboard/settings/llm");
  revalidatePath("/dashboard/ai-performance");
}

export async function clearLlmApiKeyAction(formData: FormData) {
  const tenant_id = String(formData.get("tenant_id") ?? "");
  const vendor = String(formData.get("vendor") ?? "qwen");
  if (!tenant_id) return;

  const db = await supabaseServerAuth();
  await updateTenantSettings(db, tenant_id, { llm_api_key_enc: null });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  redirect(`/dashboard/settings/llm?removed=${vendor}`);
}
