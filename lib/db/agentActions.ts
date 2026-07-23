import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgentAction, AgentActionKind, AgentActionLayer } from "@/lib/supabase/types";

export interface LogAgentActionInput {
  tenant_id: string;
  conversation_id?: string | null;
  customer_id?: string | null;
  kind: AgentActionKind;
  tool_name?: string | null;
  args?: Record<string, unknown> | null;
  result?: Record<string, unknown> | null;
  layer?: AgentActionLayer | null;
  model?: string | null;
  tokens_used?: number | null;
  latency_ms?: number | null;
}

// Append-only — never updated or deleted, same as loyalty_transactions.
// Failures here must never break a reply: callers should fire-and-log,
// not await-and-throw, on the hot conversation-turn path.
export async function logAgentAction(db: SupabaseClient, input: LogAgentActionInput): Promise<void> {
  const { error } = await db.from("agent_actions").insert({
    tenant_id: input.tenant_id,
    conversation_id: input.conversation_id ?? null,
    customer_id: input.customer_id ?? null,
    kind: input.kind,
    tool_name: input.tool_name ?? null,
    args: input.args ?? null,
    result: input.result ?? null,
    layer: input.layer ?? null,
    model: input.model ?? null,
    tokens_used: input.tokens_used ?? null,
    latency_ms: input.latency_ms ?? null,
  });
  if (error) console.error("Failed to log agent action:", error);
}

export async function listAgentActionsForConversation(db: SupabaseClient, conversation_id: string): Promise<AgentAction[]> {
  const { data, error } = await db
    .from("agent_actions")
    .select("*")
    .eq("conversation_id", conversation_id)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as AgentAction[];
}

export async function listAgentActionsForTenant(db: SupabaseClient, tenant_id: string, limit = 500): Promise<AgentAction[]> {
  const { data, error } = await db
    .from("agent_actions")
    .select("*")
    .eq("tenant_id", tenant_id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as AgentAction[];
}

// Used by lib/agents/rateLimits.ts's monthly token-budget check and the
// bot-performance dashboard. Sums only 'completion' rows — those are
// the ones carrying real tokens_used since the Phase-0-gap fix (0028);
// 'tool_call' rows never carry tokens (see runConversationTurn.ts).
export async function sumTokensSince(db: SupabaseClient, tenant_id: string, since: string): Promise<number> {
  const { data, error } = await db
    .from("agent_actions")
    .select("tokens_used")
    .eq("tenant_id", tenant_id)
    .eq("kind", "completion")
    .gte("created_at", since);
  if (error) throw error;
  return (data as { tokens_used: number | null }[]).reduce((sum, row) => sum + (row.tokens_used ?? 0), 0);
}
