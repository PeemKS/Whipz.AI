import type { SupabaseClient } from "@supabase/supabase-js";
import type { Channel, ChannelConnection } from "@/lib/supabase/types";

export async function listChannelConnections(db: SupabaseClient, tenant_id: string): Promise<ChannelConnection[]> {
  const { data, error } = await db.from("channel_connections").select("*").eq("tenant_id", tenant_id);
  if (error) throw error;
  return data as ChannelConnection[];
}

export async function getChannelConnection(
  db: SupabaseClient,
  tenant_id: string,
  channel: Channel
): Promise<ChannelConnection | null> {
  const { data, error } = await db
    .from("channel_connections")
    .select("*")
    .eq("tenant_id", tenant_id)
    .eq("channel", channel)
    .maybeSingle();
  if (error) throw error;
  return data as ChannelConnection | null;
}

// Looked up by inbound webhook payloads to resolve which tenant a
// message belongs to — external_page_id is unique per channel across
// all tenants (a Page/Channel/Shop can only be connected once).
export async function getChannelConnectionByExternalPageId(
  db: SupabaseClient,
  channel: Channel,
  external_page_id: string
): Promise<ChannelConnection | null> {
  const { data, error } = await db
    .from("channel_connections")
    .select("*")
    .eq("channel", channel)
    .eq("external_page_id", external_page_id)
    .maybeSingle();
  if (error) throw error;
  return data as ChannelConnection | null;
}

// There's a DB-level unique constraint on (channel, external_page_id)
// — a given Page/Channel/Shop can only ever belong to one tenant — but
// none on (tenant_id, channel), so "connecting again" for the same
// tenant+channel is handled here rather than via .upsert()'s onConflict.
export async function upsertChannelConnection(
  db: SupabaseClient,
  input: {
    tenant_id: string;
    channel: Channel;
    external_page_id: string;
    access_token_enc: string;
    webhook_secret_enc?: string | null;
  }
): Promise<ChannelConnection> {
  const existing = await getChannelConnection(db, input.tenant_id, input.channel);
  if (existing) {
    const { data, error } = await db
      .from("channel_connections")
      .update(input)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    return data as ChannelConnection;
  }

  const { data, error } = await db.from("channel_connections").insert(input).select("*").single();
  if (error) throw error;
  return data as ChannelConnection;
}

export async function deleteChannelConnection(db: SupabaseClient, id: string): Promise<void> {
  const { error } = await db.from("channel_connections").delete().eq("id", id);
  if (error) throw error;
}
