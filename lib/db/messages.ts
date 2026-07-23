import type { SupabaseClient } from "@supabase/supabase-js";
import type { Message, MessageSender } from "@/lib/supabase/types";

export async function listMessages(db: SupabaseClient, conversation_id: string, limit = 20): Promise<Message[]> {
  const { data, error } = await db
    .from("messages")
    .select("*")
    .eq("conversation_id", conversation_id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as Message[]).reverse();
}

// One row per conversation_id — the most recent message in each,
// keyed for an inbox list to show as a preview snippet.
export async function listLatestMessagePerConversation(
  db: SupabaseClient,
  conversation_ids: string[]
): Promise<Record<string, Message>> {
  if (conversation_ids.length === 0) return {};

  const { data, error } = await db
    .from("messages")
    .select("*")
    .in("conversation_id", conversation_ids)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const latest: Record<string, Message> = {};
  for (const message of data as Message[]) {
    if (!latest[message.conversation_id]) latest[message.conversation_id] = message;
  }
  return latest;
}

export async function createMessage(
  db: SupabaseClient,
  input: {
    tenant_id: string;
    conversation_id: string;
    sender: MessageSender;
    content: string;
    external_message_id?: string | null;
  }
): Promise<Message> {
  const { data, error } = await db.from("messages").insert(input).select("*").single();
  if (error) throw error;
  return data as Message;
}
