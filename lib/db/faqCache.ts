import type { SupabaseClient } from "@supabase/supabase-js";
import type { FaqCacheEntry } from "@/lib/supabase/types";

export async function listFaqCache(db: SupabaseClient, tenant_id: string): Promise<FaqCacheEntry[]> {
  const { data, error } = await db
    .from("faq_cache")
    .select("*")
    .eq("tenant_id", tenant_id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as FaqCacheEntry[];
}

export async function createFaqCache(
  db: SupabaseClient,
  input: { tenant_id: string; question: string; answer: string }
): Promise<FaqCacheEntry> {
  const { data, error } = await db.from("faq_cache").insert(input).select("*").single();
  if (error) throw error;
  return data as FaqCacheEntry;
}

export async function updateFaqCacheEmbedding(db: SupabaseClient, id: string, embedding: number[]): Promise<void> {
  const { error } = await db.from("faq_cache").update({ question_embedding: embedding }).eq("id", id);
  if (error) throw error;
}

export async function setFaqCacheActive(db: SupabaseClient, id: string, active: boolean): Promise<void> {
  const { error } = await db.from("faq_cache").update({ active }).eq("id", id);
  if (error) throw error;
}

export async function deleteFaqCache(db: SupabaseClient, id: string): Promise<void> {
  const { error } = await db.from("faq_cache").delete().eq("id", id);
  if (error) throw error;
}

// Cheap first-pass L1 lookup: cosine similarity between the message
// embedding (already computed for product RAG search each turn — see
// runConversationTurn.ts) and every active cached question, mirroring
// lib/db/agents.ts's matchAgents exactly.
export async function matchFaqCache(
  db: SupabaseClient,
  tenant_id: string,
  queryEmbedding: number[]
): Promise<{ id: string; question: string; answer: string; similarity: number } | null> {
  const { data, error } = await db.rpc("match_faq_cache", {
    p_tenant_id: tenant_id,
    p_query_embedding: queryEmbedding,
    p_match_count: 1,
  });
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function incrementFaqHitCount(db: SupabaseClient, id: string): Promise<void> {
  const { error } = await db.rpc("increment_faq_hit_count", { p_id: id });
  if (error) console.error("Failed to increment FAQ hit count:", error);
}
