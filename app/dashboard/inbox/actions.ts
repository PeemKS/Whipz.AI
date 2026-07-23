"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerAuth } from "@/lib/supabase/serverAuth";
import { getConversation, setHumanTakeover } from "@/lib/db/conversations";
import { createMessage } from "@/lib/db/messages";
import { getChannelConnection } from "@/lib/db/channelConnections";
import { getCustomerChannelIdentity } from "@/lib/db/customers";
import { getChannelAdapter } from "@/lib/channels/registry";
import { decryptSecret } from "@/lib/crypto/tenantKey";

export async function sendHumanReplyAction(formData: FormData) {
  const conversation_id = String(formData.get("conversation_id") ?? "");
  const content = String(formData.get("content") ?? "").trim();
  if (!conversation_id || !content) return;

  const db = await supabaseServerAuth();
  const conversation = await getConversation(db, conversation_id);
  if (!conversation) return;

  await createMessage(db, {
    tenant_id: conversation.tenant_id,
    conversation_id,
    sender: "human",
    content,
  });

  if (!conversation.human_takeover) {
    await setHumanTakeover(db, conversation_id, true);
  }

  // The Playground has no real customer on the other end — nothing to
  // deliver to. Real channels need the reply pushed out through that
  // channel's adapter using the tenant's connection + the customer's
  // per-channel identity.
  if (conversation.channel !== "playground") {
    const [connection, identity] = await Promise.all([
      getChannelConnection(db, conversation.tenant_id, conversation.channel),
      getCustomerChannelIdentity(db, conversation.tenant_id, conversation.customer_id, conversation.channel),
    ]);
    const adapter = getChannelAdapter(conversation.channel);
    if (connection && identity && adapter) {
      await adapter.sendMessage(decryptSecret(connection.access_token_enc), identity.external_user_id, content);
    }
  }

  revalidatePath(`/dashboard/inbox/${conversation_id}`);
  revalidatePath("/dashboard/inbox");
}

export async function resumeAiAction(formData: FormData) {
  const conversation_id = String(formData.get("conversation_id") ?? "");
  if (!conversation_id) return;

  const db = await supabaseServerAuth();
  await setHumanTakeover(db, conversation_id, false);

  revalidatePath(`/dashboard/inbox/${conversation_id}`);
  revalidatePath("/dashboard/inbox");
}
