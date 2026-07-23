import type { SupabaseClient } from "@supabase/supabase-js";
import type { LeadScoreEvent } from "@/lib/supabase/types";

export async function listLeadScoreEvents(db: SupabaseClient, customer_id: string, limit = 20): Promise<LeadScoreEvent[]> {
  const { data, error } = await db
    .from("lead_score_events")
    .select("*")
    .eq("customer_id", customer_id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as LeadScoreEvent[];
}

export async function createLeadScoreEvent(
  db: SupabaseClient,
  input: { tenant_id: string; customer_id: string; conversation_id?: string | null; delta: number; reason: string }
): Promise<LeadScoreEvent> {
  const { data, error } = await db.from("lead_score_events").insert(input).select("*").single();
  if (error) throw error;
  return data as LeadScoreEvent;
}
