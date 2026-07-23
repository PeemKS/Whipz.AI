import type { AgentAction, AgentActionLayer, Conversation } from "@/lib/supabase/types";

export interface BotPerformanceSummary {
  layerCounts: Record<AgentActionLayer, number>;
  layerPercents: Record<AgentActionLayer, number>;
  totalTokens: number;
  avgLatencyMs: number;
  conversationCount: number;
  tokensPerConversation: number;
  handoffCount: number;
  handoffRatePercent: number;
}

// Built from a bounded recent-actions window (listAgentActionsForTenant's
// default 500), not a full-history aggregate — fine for a dashboard
// snapshot, not a source of truth for billing. "% handled per layer" is
// workload distribution across LLM rounds/cache hits (kind in
// ['completion','l1_cache_hit']), not distinct conversations — a
// multi-round turn counts once per round, which is the more honest
// number for a cost/workload view.
export function computeBotPerformanceSummary(actions: AgentAction[], conversations: Conversation[]): BotPerformanceSummary {
  const layerRows = actions.filter((a) => a.kind === "completion" || a.kind === "l1_cache_hit");
  const layerCounts: Record<AgentActionLayer, number> = { l1: 0, l2: 0, l3: 0 };
  for (const row of layerRows) {
    if (row.layer) layerCounts[row.layer]++;
  }
  const totalLayered = layerRows.length;
  const layerPercents: Record<AgentActionLayer, number> = {
    l1: totalLayered > 0 ? Math.round((layerCounts.l1 / totalLayered) * 100) : 0,
    l2: totalLayered > 0 ? Math.round((layerCounts.l2 / totalLayered) * 100) : 0,
    l3: totalLayered > 0 ? Math.round((layerCounts.l3 / totalLayered) * 100) : 0,
  };

  const completionRows = actions.filter((a) => a.kind === "completion");
  const totalTokens = completionRows.reduce((sum, a) => sum + (a.tokens_used ?? 0), 0);
  const avgLatencyMs =
    completionRows.length > 0
      ? Math.round(completionRows.reduce((sum, a) => sum + (a.latency_ms ?? 0), 0) / completionRows.length)
      : 0;

  const conversationCount = conversations.length;
  const tokensPerConversation = conversationCount > 0 ? Math.round(totalTokens / conversationCount) : 0;
  const handoffCount = conversations.filter((c) => c.human_takeover && c.handoff_reason).length;
  const handoffRatePercent = conversationCount > 0 ? Math.round((handoffCount / conversationCount) * 100) : 0;

  return {
    layerCounts,
    layerPercents,
    totalTokens,
    avgLatencyMs,
    conversationCount,
    tokensPerConversation,
    handoffCount,
    handoffRatePercent,
  };
}
