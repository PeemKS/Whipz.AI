import type { SupabaseClient } from "@supabase/supabase-js";
import type { Tenant, LlmProvider, OpeningHours } from "@/lib/supabase/types";

export async function getTenant(db: SupabaseClient, id: string): Promise<Tenant | null> {
  const { data, error } = await db.from("tenants").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Tenant | null;
}

export async function updateTenantSettings(
  db: SupabaseClient,
  id: string,
  input: {
    business_name?: string;
    llm_provider?: LlmProvider;
    llm_model?: string;
    llm_api_key_enc?: string | null;
    category?: string | null;
    address?: string | null;
    phone?: string | null;
    website?: string | null;
    description?: string | null;
    opening_hours?: OpeningHours;
    v3_threshold_amount?: number;
    monthly_token_budget?: number | null;
  }
): Promise<Tenant> {
  const { data, error } = await db
    .from("tenants")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Tenant;
}

const BUSINESS_LOGOS_BUCKET = "business-logos";

export async function uploadTenantLogo(db: SupabaseClient, tenant_id: string, file: File): Promise<Tenant> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${tenant_id}/logo.${ext}`;

  const { error: uploadError } = await db.storage
    .from(BUSINESS_LOGOS_BUCKET)
    .upload(path, file, { contentType: file.type || "image/jpeg", upsert: true });
  if (uploadError) throw uploadError;

  const { data: publicUrlData } = db.storage.from(BUSINESS_LOGOS_BUCKET).getPublicUrl(path);
  // Cache-bust so the new logo shows immediately even though the path is stable.
  const logo_url = `${publicUrlData.publicUrl}?t=${Date.now()}`;

  const { data, error } = await db
    .from("tenants")
    .update({ logo_url, updated_at: new Date().toISOString() })
    .eq("id", tenant_id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Tenant;
}
