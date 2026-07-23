import Link from "next/link";
import { cookies } from "next/headers";
import { getCurrentTenant } from "@/lib/dashboard/currentTenant";
import { getT } from "@/lib/i18n/getT";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PENDING_PICK_COOKIE, decodePendingPick } from "@/lib/channels/pendingPick";
import { finalizeChannelPickAction } from "@/app/dashboard/settings/channels/actions";

export default async function PickChannelTargetPage() {
  const { tenant } = await getCurrentTenant();
  const t = await getT();
  const ch = t.channels;

  const cookieStore = await cookies();
  const raw = cookieStore.get(PENDING_PICK_COOKIE)?.value;
  const pending = raw ? decodePendingPick(raw) : null;

  // Expired/tampered/foreign-tenant cookie — nothing safe to show.
  if (!pending || !tenant || pending.tenant_id !== tenant.id) {
    return (
      <Card className="max-w-md">
        <p className="text-sm text-zinc-500 mb-4">{ch.pickExpired}</p>
        <Link href="/dashboard/settings/channels" className="text-sm text-violet-600 hover:underline">
          {ch.pickBackLink}
        </Link>
      </Card>
    );
  }

  return (
    <Card className="max-w-md">
      <h2 className="font-medium mb-1">{ch.pickTitle}</h2>
      <p className="text-sm text-zinc-500 mb-4">{ch.pickSubtitle}</p>
      <ul className="space-y-2">
        {pending.targets.map((target) => (
          <li key={target.id} className="flex items-center justify-between rounded-2xl border border-zinc-200 p-3">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{target.name}</div>
              <div className="text-xs text-zinc-400 font-mono truncate">{target.id}</div>
            </div>
            <form action={finalizeChannelPickAction}>
              <input type="hidden" name="target_id" value={target.id} />
              <Button type="submit" variant="secondary" size="sm">
                {ch.pickSelect}
              </Button>
            </form>
          </li>
        ))}
      </ul>
    </Card>
  );
}
