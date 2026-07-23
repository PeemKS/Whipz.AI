import type { SupabaseClient } from "@supabase/supabase-js";
import type { Conversation, Channel } from "@/lib/supabase/types";

export async function getOrCreateOpenConversation(
  db: SupabaseClient,
  tenant_id: string,
  customer_id: string,
  channel: Channel
): Promise<Conversation> {
  const existing = await db
    .from("conversations")
    .select("*")
    .eq("tenant_id", tenant_id)
    .eq("customer_id", customer_id)
    .eq("channel", channel)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data as Conversation;

  const { data, error } = await db
    .from("conversations")
    .insert({ tenant_id, customer_id, channel, status: "open" })
    .select("*")
    .single();
  if (error) throw error;
  return data as Conversation;
}

export async function listConversations(db: SupabaseClient, tenant_id: string): Promise<Conversation[]> {
  const { data, error } = await db
    .from("conversations")
    .select("*")
    .eq("tenant_id", tenant_id)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data as Conversation[];
}

export async function listConversationsWithCustomer(
  db: SupabaseClient,
  tenant_id: string
): Promise<(Conversation & { customer_display_name: string | null; customer_avatar_url: string | null })[]> {
  const { data, error } = await db
    .from("conversations")
    .select("*, customers(display_name, avatar_url)")
    .eq("tenant_id", tenant_id)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (
    data as unknown as Array<Conversation & { customers: { display_name: string | null; avatar_url: string | null } | null }>
  ).map((c) => ({
    ...c,
    customer_display_name: c.customers?.display_name ?? null,
    customer_avatar_url: c.customers?.avatar_url ?? null,
  }));
}

export async function listConversationsForCustomer(db: SupabaseClient, customer_id: string): Promise<Conversation[]> {
  const { data, error } = await db
    .from("conversations")
    .select("*")
    .eq("customer_id", customer_id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Conversation[];
}

export async function getConversation(db: SupabaseClient, id: string): Promise<Conversation | null> {
  const { data, error } = await db.from("conversations").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Conversation | null;
}

// Locks in a routing decision so the AI router only runs once per
// conversation — agent_id null + locked=true means "explicitly routed
// to the tenant's default agent", distinct from "not yet routed".
export async function setConversationAgent(
  db: SupabaseClient,
  conversation_id: string,
  agent_id: string | null
): Promise<void> {
  const { error } = await db
    .from("conversations")
    .update({ agent_id, agent_locked: true, updated_at: new Date().toISOString() })
    .eq("id", conversation_id);
  if (error) throw error;
}

// While human_takeover is true, the AI must not auto-reply to this
// conversation — see runConversationTurn's callers (chat/webhook
// routes), which check this before generating a reply.
// `reason` distinguishes an AI-triggered handoff (lib/agents/
// humanHandoff.ts, e.g. "explicit_request") from a merchant manually
// taking over via the Inbox (which passes no reason) — see
// handoff_reason on the Conversation type, used for the "needs
// attention" badge. Always cleared on resume regardless of who's
// calling, so it never lingers from a previous handoff.
export async function setHumanTakeover(
  db: SupabaseClient,
  conversation_id: string,
  human_takeover: boolean,
  reason?: string
): Promise<void> {
  const { error } = await db
    .from("conversations")
    .update({ human_takeover, handoff_reason: human_takeover ? (reason ?? null) : null, updated_at: new Date().toISOString() })
    .eq("id", conversation_id);
  if (error) throw error;
}

// Session-scoped tool-call safety cap (see runConversationTurn.ts) — a
// running total across the conversation's whole lifetime, incremented by
// however many tool calls a single round actually made.
export async function incrementToolCallCount(db: SupabaseClient, conversation_id: string, by: number): Promise<number> {
  const { data, error } = await db.rpc("increment_conversation_tool_call_count", {
    p_conversation_id: conversation_id,
    p_by: by,
  });
  if (error) throw error;
  return data as number;
}
