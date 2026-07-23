import { cache } from "react";
import { cookies } from "next/headers";
import { supabaseServerAuth } from "@/lib/supabase/serverAuth";
import type { Tenant } from "@/lib/supabase/types";

export const CURRENT_TENANT_COOKIE = "current_tenant_id";

// Lists only the tenants the signed-in user belongs to — enforced by
// the `tenant_select_member` RLS policy, not filtered client-side.
// Wrapped in React's cache() since both the root layout (sidebar brand
// block) and the dashboard layout (header/empty-state) call this within
// the same request.
export const getCurrentTenant = cache(async (): Promise<{ tenant: Tenant | null; tenants: Tenant[] }> => {
  const supabase = await supabaseServerAuth();
  const { data, error } = await supabase.from("tenants").select("*").order("created_at", { ascending: true });
  if (error) throw error;

  const tenants = (data ?? []) as Tenant[];
  if (tenants.length === 0) return { tenant: null, tenants };

  const cookieStore = await cookies();
  const cookieId = cookieStore.get(CURRENT_TENANT_COOKIE)?.value;
  const tenant = tenants.find((t) => t.id === cookieId) ?? tenants[0];
  return { tenant, tenants };
});
