import { getCurrentTenant } from "@/lib/dashboard/currentTenant";
import { supabaseServerAuth } from "@/lib/supabase/serverAuth";
import { listPromotions } from "@/lib/db/promotions";
import { listProducts } from "@/lib/db/products";
import { listPromoTerms } from "@/lib/db/promoTerms";
import {
  setPromotionActiveAction,
  deletePromotionAction,
  setPromoTermActiveAction,
  deletePromoTermAction,
} from "@/app/dashboard/promotions/actions";
import { AddPromotionWizard } from "@/app/dashboard/promotions/AddPromotionWizard";
import { AddPromoTermWizard } from "@/app/dashboard/promotions/AddPromoTermWizard";
import { getT } from "@/lib/i18n/getT";
import { getLocale } from "@/lib/i18n/getLocale";
import { formatDateTime } from "@/lib/i18n/formatDate";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";

const STATUS_VARIANT = {
  active: "success",
  scheduled: "info",
  draft: "neutral",
  expired: "neutral",
  paused: "warning",
} as const;

function formatCurrency(n: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
}

export default async function PromotionsPage() {
  const { tenant } = await getCurrentTenant();
  if (!tenant) return null;
  const db = await supabaseServerAuth();
  const [promotions, products, promoTerms] = await Promise.all([
    listPromotions(db, tenant.id),
    listProducts(db, tenant.id),
    listPromoTerms(db, tenant.id),
  ]);
  const t = await getT();
  const locale = await getLocale();
  const pr = t.promotions;

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <AddPromotionWizard
          tenantId={tenant.id}
          products={products.map((p) => ({ id: p.id, name: p.name }))}
          t={pr}
          cancelLabel={t.common.cancel}
        />
      </div>

      <Card padding="none" className="overflow-hidden">
        <table className="w-full text-sm text-center">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-4 py-2 font-medium">{pr.type}</th>
              <th className="px-4 py-2 font-medium">{pr.status}</th>
              <th className="px-4 py-2 font-medium">{pr.starts}</th>
              <th className="px-4 py-2 font-medium">{pr.ends}</th>
              <th className="px-4 py-2 font-medium">{pr.active}</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {promotions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-zinc-500">
                  {pr.noneYet}
                </td>
              </tr>
            )}
            {promotions.map((promo) => {
              const effectiveStatus = promo.manual_override ?? promo.status;
              const isActive = promo.manual_override !== "paused";
              return (
                <tr key={promo.id} className="border-t border-zinc-100 align-middle">
                  <td className="px-4 py-2 font-medium">{promo.type}</td>
                  <td className="px-4 py-2">
                    <Badge variant={STATUS_VARIANT[effectiveStatus as keyof typeof STATUS_VARIANT]}>{effectiveStatus}</Badge>
                  </td>
                  <td className="px-4 py-2 text-xs text-zinc-500">{formatDateTime(promo.start_at, locale)}</td>
                  <td className="px-4 py-2 text-xs text-zinc-500">{formatDateTime(promo.end_at, locale)}</td>
                  <td className="px-4 py-2">
                    <form action={setPromotionActiveAction}>
                      <input type="hidden" name="id" value={promo.id} />
                      <Toggle defaultChecked={isActive} aria-label={pr.active} />
                    </form>
                  </td>
                  <td className="px-4 py-2">
                    <form action={deletePromotionAction}>
                      <input type="hidden" name="id" value={promo.id} />
                      <Button type="submit" variant="destructive" size="sm">
                        {t.common.delete}
                      </Button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-lg font-semibold">{pr.promoCodesTitle}</h2>
            <p className="text-sm text-zinc-500">{pr.promoCodesSubtitle}</p>
          </div>
          <AddPromoTermWizard tenantId={tenant.id} t={pr} cancelLabel={t.common.cancel} />
        </div>

        <Card padding="none" className="overflow-hidden">
          <table className="w-full text-sm text-center">
            <thead className="bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">{pr.code}</th>
                <th className="px-4 py-2 font-medium">{pr.discount}</th>
                <th className="px-4 py-2 font-medium">{pr.usesLimit}</th>
                <th className="px-4 py-2 font-medium">{pr.minOrder}</th>
                <th className="px-4 py-2 font-medium">{pr.active}</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {promoTerms.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-zinc-500">
                    {pr.noPromoCodesYet}
                  </td>
                </tr>
              )}
              {promoTerms.map((term) => (
                <tr key={term.id} className="border-t border-zinc-100 align-middle">
                  <td className="px-4 py-2 font-mono text-xs font-medium">{term.code}</td>
                  <td className="px-4 py-2">
                    {term.discount_type === "percent" ? `${term.discount_value}%` : formatCurrency(term.discount_value) + " off"}
                  </td>
                  <td className="px-4 py-2 text-zinc-500">{term.max_uses_per_customer ?? pr.unlimited}</td>
                  <td className="px-4 py-2 text-zinc-500">{term.min_order_amount != null ? formatCurrency(term.min_order_amount) : pr.none}</td>
                  <td className="px-4 py-2">
                    <form action={setPromoTermActiveAction} className="flex justify-center">
                      <input type="hidden" name="id" value={term.id} />
                      <input type="hidden" name="active" value={String(term.active)} />
                      <Toggle defaultChecked={term.active} aria-label={pr.active} />
                    </form>
                  </td>
                  <td className="px-4 py-2">
                    <form action={deletePromoTermAction}>
                      <input type="hidden" name="id" value={term.id} />
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
    </div>
  );
}
