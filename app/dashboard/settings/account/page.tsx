import { getCurrentUser } from "@/lib/supabase/getCurrentUser";
import { supabaseServerAuth } from "@/lib/supabase/serverAuth";
import { getT } from "@/lib/i18n/getT";
import { format } from "@/lib/i18n/format";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ChangePasswordForm } from "@/app/dashboard/settings/account/ChangePasswordForm";
import { DeleteAccountForm } from "@/app/dashboard/settings/account/DeleteAccountForm";

export default async function AccountSettingsPage() {
  const { id, email } = await getCurrentUser();
  const t = await getT();
  const s = t.settings;
  if (!id || !email) return null;

  const db = await supabaseServerAuth();
  const { data: memberships } = await db.from("tenant_members").select("tenant_id").eq("user_id", id);
  const tenantIds = (memberships ?? []).map((m) => m.tenant_id);

  // Tenants this user is the sole member of — deleting the account would
  // cascade-remove their tenant_members row and orphan these permanently
  // (no invite-a-co-owner feature exists to move ownership first).
  const soleTenants: { name: string; products: number; orders: number; customers: number }[] = [];
  for (const tenantId of tenantIds) {
    const { count: memberCount } = await db
      .from("tenant_members")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId);
    if ((memberCount ?? 0) > 1) continue;

    const { data: tenantRow } = await db.from("tenants").select("business_name").eq("id", tenantId).maybeSingle();
    const [{ count: products }, { count: orders }, { count: customers }] = await Promise.all([
      db.from("products").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
      db.from("orders").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
      db.from("customers").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
    ]);
    soleTenants.push({
      name: tenantRow?.business_name ?? "—",
      products: products ?? 0,
      orders: orders ?? 0,
      customers: customers ?? 0,
    });
  }

  return (
    <div className="space-y-6">
      <Card className="max-w-lg">
        <h2 className="font-medium mb-3">{s.changePasswordTitle}</h2>
        <ChangePasswordForm
          t={{
            newPassword: s.newPassword,
            confirmPassword: s.confirmPassword,
            passwordMismatch: s.passwordMismatch,
            passwordTooShort: s.passwordTooShort,
            updatePassword: s.updatePassword,
          }}
        />
      </Card>

      <Card className="max-w-lg">
        <h2 className="font-medium mb-1">{s.linkedAccountsTitle}</h2>
        <p className="text-sm text-zinc-500 mb-3">{s.linkedAccountsDesc}</p>
        <div className="flex items-center justify-between rounded-2xl p-3 border border-zinc-200 opacity-60">
          <span className="text-sm font-medium">{s.linkGoogle}</span>
          <Badge variant="neutral">{s.comingSoon}</Badge>
        </div>
      </Card>

      <Card className="max-w-lg border-red-100">
        <h2 className="font-medium text-red-600 mb-3">{s.dangerZoneTitle}</h2>
        <h3 className="text-sm font-medium mb-1">{s.deleteAccountTitle}</h3>
        <p className="text-sm text-zinc-500 mb-3">{s.deleteAccountDesc}</p>
        {soleTenants.length > 0 && (
          <ul className="text-sm text-amber-700 bg-amber-50 rounded-2xl p-3 mb-3 space-y-1">
            {soleTenants.map((tt) => (
              <li key={tt.name}>
                {format(s.deleteAccountTenantWarning, {
                  tenant: tt.name,
                  count: tt.products + tt.orders + tt.customers,
                  products: tt.products,
                  orders: tt.orders,
                  customers: tt.customers,
                })}
              </li>
            ))}
          </ul>
        )}
        <DeleteAccountForm
          email={email}
          confirmLabel={format(s.deleteAccountConfirmLabel, { email })}
          buttonLabel={s.deleteAccountButton}
        />
      </Card>
    </div>
  );
}
