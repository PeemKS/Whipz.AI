import { getCurrentTenant } from "@/lib/dashboard/currentTenant";
import { createTenantAction } from "@/lib/dashboard/actions";
import { getT } from "@/lib/i18n/getT";
import { getCurrentUser } from "@/lib/supabase/getCurrentUser";
import { nameFromEmail } from "@/lib/format/userName";
import { format } from "@/lib/i18n/format";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

// These pages depend on the signed-in user's session (cookies) and
// live DB state — never statically prerenderable.
export const dynamic = "force-dynamic";

function greetingFor(hour: number, t: Awaited<ReturnType<typeof getT>>, name: string) {
  const key = hour < 12 ? "greetingMorning" : hour < 18 ? "greetingAfternoon" : "greetingEvening";
  return format(t.shell[key], { name });
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { tenant } = await getCurrentTenant();
  const t = await getT();
  const { email, name } = await getCurrentUser();
  const displayName = name ?? nameFromEmail(email);
  const greeting = greetingFor(new Date().getHours(), t, displayName);

  if (!tenant) {
    return (
      <div>
        <Card className="max-w-md">
          <h1 className="text-xl font-semibold mb-2">{t.shell.createBusiness}</h1>
          <p className="text-sm text-zinc-500 mb-4">{t.shell.createBusinessDesc}</p>
          <form action={createTenantAction} className="flex gap-2">
            <Input name="business_name" required placeholder={t.shell.businessNamePlaceholder} className="flex-1" />
            <Button type="submit">{t.shell.create}</Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <h1 className="text-3xl font-bold text-zinc-900 mb-6 shrink-0">{greeting}</h1>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
