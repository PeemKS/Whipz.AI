"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerAuth } from "@/lib/supabase/serverAuth";
import { upsertChannelConnection, deleteChannelConnection } from "@/lib/db/channelConnections";
import { encryptSecret } from "@/lib/crypto/tenantKey";
import { getChannelAdapter } from "@/lib/channels/registry";
import type { Channel } from "@/lib/supabase/types";

export async function connectManualChannelAction(formData: FormData) {
  const tenant_id = String(formData.get("tenant_id") ?? "");
  const channel = String(formData.get("channel") ?? "") as Channel;
  if (!tenant_id || !channel) return;

  const adapter = getChannelAdapter(channel);
  if (!adapter || adapter.connectionMethod !== "manual") return;

  const fields: Record<string, string> = {};
  for (const field of adapter.manualFields) {
    fields[field.name] = String(formData.get(field.name) ?? "").trim();
  }
  if (Object.values(fields).some((v) => !v)) return;

  const { external_page_id, access_token, webhook_secret } = adapter.parseManualFields(fields);

  const db = await supabaseServerAuth();
  await upsertChannelConnection(db, {
    tenant_id,
    channel,
    external_page_id,
    access_token_enc: encryptSecret(access_token),
    webhook_secret_enc: webhook_secret ? encryptSecret(webhook_secret) : null,
  });

  revalidatePath("/dashboard/settings/channels");
}

export async function disconnectChannelAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const db = await supabaseServerAuth();
  await deleteChannelConnection(db, id);
  revalidatePath("/dashboard/settings/channels");
}
