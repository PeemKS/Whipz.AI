"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { supabaseServerAuth } from "@/lib/supabase/serverAuth";
import { CURRENT_TENANT_COOKIE } from "@/lib/dashboard/currentTenant";

export async function createTenantAction(formData: FormData) {
  const business_name = String(formData.get("business_name") ?? "").trim();
  if (!business_name) return;

  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Pre-generate the id and skip `.select()` on this insert: PostgREST
  // does INSERT ... RETURNING under the hood, and RETURNING rows are
  // filtered through the SELECT policy — which requires a tenant_members
  // row that doesn't exist yet at this point (it's the next statement),
  // so asking for the row back here would 42501 on every first tenant.
  const tenantId = crypto.randomUUID();
  const { error } = await supabase.from("tenants").insert({ id: tenantId, business_name });
  if (error) throw error;

  const { error: memberError } = await supabase
    .from("tenant_members")
    .insert({ tenant_id: tenantId, user_id: user.id, role: "owner" });
  if (memberError) throw memberError;

  const store = await cookies();
  store.set(CURRENT_TENANT_COOKIE, tenantId, { path: "/" });
  revalidatePath("/dashboard", "layout");
}

export async function signOutAction() {
  const supabase = await supabaseServerAuth();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
}
