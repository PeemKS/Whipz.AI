import { getCurrentTenant } from "@/lib/dashboard/currentTenant";
import { supabaseServerAuth } from "@/lib/supabase/serverAuth";
import { listAgents } from "@/lib/db/agents";
import { toggleAgentActiveAction, deleteAgentAction } from "@/app/dashboard/agents/actions";
import { AddAgentWizard } from "@/app/dashboard/agents/AddAgentWizard";
import { getT } from "@/lib/i18n/getT";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default async function AgentsPage() {
  const { tenant } = await getCurrentTenant();
  if (!tenant) return null;
  const db = await supabaseServerAuth();
  const agents = await listAgents(db, tenant.id);
  const t = await getT();
  const a = t.agents;

  return (
    <div className="space-y-8">
      <Card padding="sm" className="text-sm text-zinc-600">
        {a.infoBanner}
      </Card>

      <div className="flex justify-end">
        <AddAgentWizard tenantId={tenant.id} t={a} cancelLabel={t.common.cancel} />
      </div>

      <Card padding="none" className="overflow-hidden">
        <table className="w-full text-sm text-center">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-4 py-2 font-medium">{a.nameLabel}</th>
              <th className="px-4 py-2 font-medium">{a.specializationHeader}</th>
              <th className="px-4 py-2 font-medium">{t.promotions.status}</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {agents.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-zinc-500">
                  {a.noneYet}
                </td>
              </tr>
            )}
            {agents.map((agent) => (
              <tr key={agent.id} className="border-t border-zinc-100 align-middle">
                <td className="px-4 py-2 font-medium">{agent.name}</td>
                <td className="px-4 py-2 max-w-md">
                  <p className="text-xs text-zinc-600">
                    <span className="text-zinc-400">{a.whenToUse} </span>
                    {agent.specialization}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1 whitespace-pre-wrap">{agent.system_prompt}</p>
                </td>
                <td className="px-4 py-2">
                  <Badge variant={agent.is_active ? "success" : "neutral"}>
                    {agent.is_active ? t.common.active : t.common.inactive}
                  </Badge>
                </td>
                <td className="px-4 py-2">
                  <div className="flex justify-center gap-2">
                    <form action={toggleAgentActiveAction}>
                      <input type="hidden" name="id" value={agent.id} />
                      <input type="hidden" name="is_active" value={String(agent.is_active)} />
                      <Button type="submit" variant="secondary" size="sm">
                        {agent.is_active ? a.deactivate : a.activate}
                      </Button>
                    </form>
                    <form action={deleteAgentAction}>
                      <input type="hidden" name="id" value={agent.id} />
                      <Button type="submit" variant="destructive" size="sm">
                        {t.common.delete}
                      </Button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
