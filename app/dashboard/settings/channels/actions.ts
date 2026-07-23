"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { supabaseServerAuth } from "@/lib/supabase/serverAuth";
import { upsertChannelConnection, deleteChannelConnection } from "@/lib/db/channelConnections";
import { encryptSecret } from "@/lib/crypto/tenantKey";
import { getChannelAdapter } from "@/lib/channels/registry";
import { getCurrentTenant } from "@/lib/dashboard/currentTenant";
import { PENDING_PICK_COOKIE, decodePendingPick } from "@/lib/channels/pendingPick";
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

// Completes the flow started by the OAuth callback for multi-target
// channels (see lib/channels/pendingPick.ts) — the user picked a
// specific Page on /dashboard/settings/channels/pick, this resolves it
// (subscribing to webhooks etc. via the adapter) and stores the
// connection exactly like a single-target exchangeCode would have.
export async function finalizeChannelPickAction(formData: FormData) {
  const target_id = String(formData.get("target_id") ?? "");
  const cookieStore = await cookies();
  const raw = cookieStore.get(PENDING_PICK_COOKIE)?.value;
  const pending = raw ? decodePendingPick(raw) : null;

  const { tenant } = await getCurrentTenant();
  if (!target_id || !pending || !tenant || pending.tenant_id !== tenant.id) {
    redirect("/dashboard/settings/channels/pick");
  }

  const target = pending.targets.find((t) => t.id === target_id);
  const adapter = getChannelAdapter(pending.channel);
  if (!target || !adapter || adapter.connectionMethod !== "oauth" || !adapter.finalizeTarget) {
    redirect("/dashboard/settings/channels/pick");
  }

  try {
    const { external_page_id, access_token, webhook_secret } = await adapter.finalizeTarget(target);
    const db = await supabaseServerAuth();
    await upsertChannelConnection(db, {
      tenant_id: tenant.id,
      channel: pending.channel,
      external_page_id,
      access_token_enc: encryptSecret(access_token),
      webhook_secret_enc: webhook_secret ? encryptSecret(webhook_secret) : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    cookieStore.delete(PENDING_PICK_COOKIE);
    redirect(`/dashboard/settings/channels?error=${encodeURIComponent(message)}`);
  }

  cookieStore.delete(PENDING_PICK_COOKIE);
  revalidatePath("/dashboard/settings/channels");
  redirect(`/dashboard/settings/channels?connected=${pending.channel}`);
}
