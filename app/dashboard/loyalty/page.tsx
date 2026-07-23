import { getCurrentTenant } from "@/lib/dashboard/currentTenant";
import { supabaseServerAuth } from "@/lib/supabase/serverAuth";
import { listMembershipTiers } from "@/lib/db/membershipTiers";
import { listRewards } from "@/lib/db/rewards";
import { deleteTierAction, toggleRewardActiveAction, deleteRewardAction } from "@/app/dashboard/loyalty/actions";
import { AddTierWizard } from "@/app/dashboard/loyalty/AddTierWizard";
import { AddRewardWizard } from "@/app/dashboard/loyalty/AddRewardWizard";
import { getT } from "@/lib/i18n/getT";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";

export default async function LoyaltyPage() {
  const { tenant } = await getCurrentTenant();
  if (!tenant) return null;
  const db = await supabaseServerAuth();
  const [tiers, rewards] = await Promise.all([listMembershipTiers(db, tenant.id), listRewards(db, tenant.id)]);
  const t = await getT();
  const l = t.loyalty;

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-medium">{l.membershipTiers}</h2>
            <p className="text-sm text-zinc-500">{l.tiersDesc}</p>
          </div>
          <AddTierWizard tenantId={tenant.id} t={l} cancelLabel={t.common.cancel} />
        </div>

        <Card padding="none" className="overflow-hidden">
          <table className="w-full text-sm text-center">
            <thead className="bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">{l.name}</th>
                <th className="px-4 py-2 font-medium">{l.minSpendHeader}</th>
                <th className="px-4 py-2 font-medium">{l.multiplierHeader}</th>
                <th className="px-4 py-2 font-medium">{l.perksHeader}</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {tiers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">
                    {l.noTiers}
                  </td>
                </tr>
              )}
              {tiers.map((tier) => (
                <tr key={tier.id} className="border-t border-zinc-100 align-middle">
                  <td className="px-4 py-2 font-medium">{tier.name}</td>
                  <td className="px-4 py-2">
                    <Badge variant="neutral">
                      ${tier.min_spend}
                      {l.minSpendSuffix}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant="neutral">
                      {tier.point_multiplier}
                      {l.multiplierSuffix}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-xs text-zinc-500">{tier.perks ?? ""}</td>
                  <td className="px-4 py-2">
                    <form action={deleteTierAction}>
                      <input type="hidden" name="id" value={tier.id} />
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
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-medium">{l.rewardsCatalog}</h2>
          <AddRewardWizard tenantId={tenant.id} t={l} cancelLabel={t.common.cancel} />
        </div>

        <Card padding="none" className="overflow-hidden">
          <table className="w-full text-sm text-center">
            <thead className="bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">{l.name}</th>
                <th className="px-4 py-2 font-medium">{l.pointsHeader}</th>
                <th className="px-4 py-2 font-medium">{l.descriptionHeader}</th>
                <th className="px-4 py-2 font-medium">{l.statusHeader}</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {rewards.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">
                    {l.noRewards}
                  </td>
                </tr>
              )}
              {rewards.map((reward) => (
                <tr key={reward.id} className="border-t border-zinc-100 align-middle">
                  <td className="px-4 py-2 font-medium">{reward.name}</td>
                  <td className="px-4 py-2">
                    <Badge variant="neutral">
                      {reward.points_cost} {l.ptsSuffix}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-xs text-zinc-500">{reward.description ?? ""}</td>
                  <td className="px-4 py-2">
                    <form action={toggleRewardActiveAction}>
                      <input type="hidden" name="id" value={reward.id} />
                      <input type="hidden" name="is_active" value={String(reward.is_active)} />
                      <Toggle defaultChecked={reward.is_active} aria-label={l.statusHeader} />
                    </form>
                  </td>
                  <td className="px-4 py-2">
                    <form action={deleteRewardAction}>
                      <input type="hidden" name="id" value={reward.id} />
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
      </section>
    </div>
  );
}
