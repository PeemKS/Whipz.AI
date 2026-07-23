import { getCurrentTenant } from "@/lib/dashboard/currentTenant";
import { supabaseServerAuth } from "@/lib/supabase/serverAuth";
import { listAgentActionsForTenant } from "@/lib/db/agentActions";
import { listConversations } from "@/lib/db/conversations";
import { computeBotPerformanceSummary } from "@/lib/agents/metrics";
import { checkTokenBudget } from "@/lib/agents/rateLimits";
import { getT } from "@/lib/i18n/getT";
import { format } from "@/lib/i18n/format";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { AgentActionLayer } from "@/lib/supabase/types";

const LAYER_BAR_CLASS: Record<AgentActionLayer, string> = {
  l1: "bg-emerald-500",
  l2: "bg-violet-500",
  l3: "bg-amber-500",
};

export default async function AiPerformancePage() {
  const { tenant } = await getCurrentTenant();
  if (!tenant) return null;
  const db = await supabaseServerAuth();
  const t = await getT();
  const p = t.aiPerformance;

  const [actions, conversations, tokenBudget] = await Promise.all([
    listAgentActionsForTenant(db, tenant.id),
    listConversations(db, tenant.id),
    checkTokenBudget(db, tenant.id, tenant.monthly_token_budget),
  ]);
  const summary = computeBotPerformanceSummary(actions, conversations);

  const layerLabels: Record<AgentActionLayer, string> = { l1: p.layerL1, l2: p.layerL2, l3: p.layerL3 };

  return (
    // pb-8: see the comment in app/dashboard/page.tsx — <main>'s own
    // bottom padding gets excluded from the scrollable region by the
    // shared h-full/flex-1/min-h-0 layout chain once this page's content
    // overflows it, so the gap has to live on the content itself.
    <div className="space-y-5 pb-8">
      <p className="text-sm text-zinc-500">{p.subtitle}</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <div className="text-2xl font-semibold">{summary.conversationCount}</div>
          <div className="text-xs text-zinc-500 mt-1">{p.conversations}</div>
        </Card>
        <Card>
          <div className="text-2xl font-semibold">{summary.tokensPerConversation.toLocaleString()}</div>
          <div className="text-xs text-zinc-500 mt-1">{p.tokensPerConversation}</div>
        </Card>
        <Card>
          <div className="text-2xl font-semibold">{summary.avgLatencyMs.toLocaleString()}ms</div>
          <div className="text-xs text-zinc-500 mt-1">{p.avgLatency}</div>
        </Card>
        <Card>
          <div className="text-2xl font-semibold">{summary.handoffRatePercent}%</div>
          <div className="text-xs text-zinc-500 mt-1">{format(p.handoffRate, { count: summary.handoffCount })}</div>
        </Card>
      </div>

      <Card>
        <h2 className="font-medium text-sm mb-1">{p.layerTitle}</h2>
        <p className="text-xs text-zinc-500 mb-4">{p.layerSubtitle}</p>
        <div className="space-y-3">
          {(["l1", "l2", "l3"] as const).map((layer) => (
            <div key={layer} className="flex items-center gap-3">
              <div className="w-24 text-xs text-zinc-600 shrink-0">{layerLabels[layer]}</div>
              <div className="flex-1 h-5 bg-zinc-100 rounded-sm overflow-hidden">
                <div
                  className={`h-full rounded-r-[4px] ${LAYER_BAR_CLASS[layer]}`}
                  style={{ width: `${Math.max(2, summary.layerPercents[layer])}%` }}
                />
              </div>
              <div className="w-12 text-xs font-medium text-zinc-900 text-right shrink-0 tabular-nums">
                {summary.layerPercents[layer]}%
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-medium text-sm">{p.tokenBudgetTitle}</h2>
          {tokenBudget.budget != null && tokenBudget.softAlert && (
            <Badge variant={tokenBudget.overBudget ? "destructive" : "warning"}>
              {tokenBudget.overBudget ? p.tokenBudgetOver : p.tokenBudgetSoftAlert}
            </Badge>
          )}
        </div>
        {tokenBudget.budget == null ? (
          <p className="text-sm text-zinc-500">{p.tokenBudgetUnset}</p>
        ) : (
          <>
            <p className="text-sm text-zinc-600 mb-2">
              {format(p.tokenBudgetUsage, { used: tokenBudget.used.toLocaleString(), budget: tokenBudget.budget.toLocaleString() })}
            </p>
            <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${tokenBudget.overBudget ? "bg-red-500" : tokenBudget.softAlert ? "bg-amber-500" : "bg-violet-500"}`}
                style={{ width: `${Math.min(100, Math.round(tokenBudget.ratio * 100))}%` }}
              />
            </div>
          </>
        )}
        <p className="text-xs text-zinc-400 mt-3">{p.tokenBudgetHelp}</p>
      </Card>
    </div>
  );
}
