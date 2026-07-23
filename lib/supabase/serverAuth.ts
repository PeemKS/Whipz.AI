import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// RLS-scoped client bound to the signed-in user's session cookies.
// Use this for all dashboard reads/writes so `app_current_tenant_ids()`
// and `app_auth_uid()` resolve to the real logged-in user.
export async function supabaseServerAuth() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // setAll called from a Server Component without a mutable
            // response — safe to ignore since middleware refreshes
            // the session on every request.
          }
        },
      },
    }
  );
}
