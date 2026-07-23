import { getCurrentTenant } from "@/lib/dashboard/currentTenant";
import { supabaseServerAuth } from "@/lib/supabase/serverAuth";
import { listFaqCache } from "@/lib/db/faqCache";
import { toggleFaqCacheActiveAction, deleteFaqCacheAction } from "@/app/dashboard/settings/faq-cache/actions";
import { AddFaqWizard } from "@/app/dashboard/settings/faq-cache/AddFaqWizard";
import { getT } from "@/lib/i18n/getT";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";

export default async function FaqCachePage() {
  const { tenant } = await getCurrentTenant();
  if (!tenant) return null;
  const db = await supabaseServerAuth();
  const entries = await listFaqCache(db, tenant.id);
  const t = await getT();
  const f = t.faqCache;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">{f.title}</h1>
        <p className="text-sm text-zinc-500">{f.description}</p>
      </div>

      <div className="flex justify-end">
        <AddFaqWizard tenantId={tenant.id} t={f} cancelLabel={t.common.cancel} />
      </div>

      <Card padding="none" className="overflow-hidden">
        <table className="w-full text-sm text-center">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-4 py-2 font-medium">{f.question}</th>
              <th className="px-4 py-2 font-medium">{f.answer}</th>
              <th className="px-4 py-2 font-medium">{f.hits}</th>
              <th className="px-4 py-2 font-medium">{f.active}</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">
                  {f.noneYet}
                </td>
              </tr>
            )}
            {entries.map((entry) => (
              <tr key={entry.id} className="border-t border-zinc-100 align-middle">
                <td className="px-4 py-2 text-left max-w-xs truncate">{entry.question}</td>
                <td className="px-4 py-2 text-left max-w-xs truncate text-zinc-500">{entry.answer}</td>
                <td className="px-4 py-2 tabular-nums">{entry.hit_count}</td>
                <td className="px-4 py-2">
                  <form action={toggleFaqCacheActiveAction} className="flex justify-center">
                    <input type="hidden" name="id" value={entry.id} />
                    <input type="hidden" name="active" value={String(entry.active)} />
                    <Toggle defaultChecked={entry.active} aria-label={f.active} />
                  </form>
                </td>
                <td className="px-4 py-2">
                  <form action={deleteFaqCacheAction}>
                    <input type="hidden" name="id" value={entry.id} />
                    <Button type="submit" variant="destructive" size="sm">
                      {t.common.delete}
                    </Button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
