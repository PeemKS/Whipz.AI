import { NextRequest, NextResponse } from "next/server";
import { getChannelAdapter } from "@/lib/channels/registry";
import { getChannelConnectionByExternalPageId } from "@/lib/db/channelConnections";
import { getOrCreateCustomerByChannel } from "@/lib/db/customers";
import { getOrCreateOpenConversation } from "@/lib/db/conversations";
import { createMessage } from "@/lib/db/messages";
import { runConversationTurn } from "@/lib/agents/runConversationTurn";
import { supabaseAdmin } from "@/lib/supabase/server";
import { decryptSecret } from "@/lib/crypto/tenantKey";
import type { Channel } from "@/lib/supabase/types";

// Meta requires a GET handshake echoing hub.challenge before it'll
// start delivering webhooks; LINE and TikTok don't need this.
export async function GET(req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  if (platform === "facebook" || platform === "instagram") {
    const mode = req.nextUrl.searchParams.get("hub.mode");
    const token = req.nextUrl.searchParams.get("hub.verify_token");
    const challenge = req.nextUrl.searchParams.get("hub.challenge");
    if (mode === "subscribe" && challenge && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
      return new NextResponse(challenge, { status: 200 });
    }
    return NextResponse.json({ error: "verification failed" }, { status: 403 });
  }
  return NextResponse.json({ ok: true, platform });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  const channel = platform as Channel;
  const adapter = getChannelAdapter(channel);
  if (!adapter) {
    return NextResponse.json({ error: `Unknown channel "${platform}"` }, { status: 404 });
  }

  const rawBody = await req.text();
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const events = adapter.parseEvents(payload);
  if (events.length === 0) {
    // Nothing to act on (e.g. read receipts, non-text events) — still 200 so the provider doesn't retry.
    return NextResponse.json({ ok: true });
  }

  const db = supabaseAdmin();

  for (const event of events) {
    const connection = await getChannelConnectionByExternalPageId(db, channel, event.external_page_id);
    if (!connection) continue; // webhook for a page/channel we don't have connected

    // Meta signs the whole payload with the shared App Secret; LINE
    // and TikTok sign with the per-connection secret they were issued.
    const webhookSecret =
      channel === "facebook" || channel === "instagram"
        ? process.env.META_APP_SECRET
        : connection.webhook_secret_enc
          ? decryptSecret(connection.webhook_secret_enc)
          : undefined;
    if (!webhookSecret) continue;
    if (!adapter.verifyWebhookSignature(rawBody, req.headers, webhookSecret)) continue;

    const customer = await getOrCreateCustomerByChannel(
      db,
      connection.tenant_id,
      channel,
      event.external_user_id,
      event.display_name,
      adapter.getUserProfile
        ? () => adapter.getUserProfile!(event.external_user_id, decryptSecret(connection.access_token_enc))
        : undefined
    );
    const conversation = await getOrCreateOpenConversation(db, connection.tenant_id, customer.id, channel);

    // A human has taken this conversation over from the Inbox — the AI
    // stays quiet (and nothing gets pushed back to the customer here)
    // until they hand it back.
    if (conversation.human_takeover) {
      await createMessage(db, {
        tenant_id: connection.tenant_id,
        conversation_id: conversation.id,
        sender: "customer",
        content: event.text,
        external_message_id: null,
      });
      continue;
    }

    const result = await runConversationTurn(db, connection.tenant_id, conversation.id, customer.id, event.text);

    await adapter.sendMessage(decryptSecret(connection.access_token_enc), event.external_user_id, result.reply);
  }

  return NextResponse.json({ ok: true });
}
