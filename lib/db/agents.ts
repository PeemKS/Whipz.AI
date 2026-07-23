import type { SupabaseClient } from "@supabase/supabase-js";
import type { Agent } from "@/lib/supabase/types";

export async function listAgents(db: SupabaseClient, tenant_id: string): Promise<Agent[]> {
  const { data, error } = await db
    .from("agents")
    .select("*")
    .eq("tenant_id", tenant_id)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as Agent[];
}

export async function listActiveAgents(db: SupabaseClient, tenant_id: string): Promise<Agent[]> {
  const { data, error } = await db
    .from("agents")
    .select("*")
    .eq("tenant_id", tenant_id)
    .eq("is_active", true);
  if (error) throw error;
  return data as Agent[];
}

export async function getAgent(db: SupabaseClient, id: string): Promise<Agent | null> {
  const { data, error } = await db.from("agents").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Agent | null;
}

export async function createAgent(
  db: SupabaseClient,
  input: { tenant_id: string; name: string; specialization: string; system_prompt: string }
): Promise<Agent> {
  const { data, error } = await db.from("agents").insert(input).select("*").single();
  if (error) throw error;
  return data as Agent;
}

export async function updateAgent(
  db: SupabaseClient,
  id: string,
  input: Partial<Pick<Agent, "name" | "specialization" | "system_prompt" | "is_active">>
): Promise<Agent> {
  const { data, error } = await db
    .from("agents")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Agent;
}

export async function deleteAgent(db: SupabaseClient, id: string): Promise<void> {
  const { error } = await db.from("agents").delete().eq("id", id);
  if (error) throw error;
}

export async function updateAgentEmbedding(db: SupabaseClient, id: string, embedding: number[]): Promise<void> {
  const { error } = await db.from("agents").update({ specialization_embedding: embedding }).eq("id", id);
  if (error) throw error;
}

// Cheap first-pass routing: cosine similarity between the message
// embedding (already computed for product RAG search each turn) and
// each active agent's specialization embedding. Confident matches skip
// the LLM tool-call router entirely (see lib/agents/pickAgent.ts).
export async function matchAgents(
  db: SupabaseClient,
  tenant_id: string,
  queryEmbedding: number[],
  limit = 5
): Promise<{ id: string; name: string; specialization: string; similarity: number }[]> {
  const { data, error } = await db.rpc("match_agents", {
    p_tenant_id: tenant_id,
    p_query_embedding: queryEmbedding,
    p_match_count: limit,
  });
  if (error) throw error;
  return data;
}
