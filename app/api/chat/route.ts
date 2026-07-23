import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getOrCreateCustomerByChannel } from "@/lib/db/customers";
import { getOrCreateOpenConversation } from "@/lib/db/conversations";
import { createMessage } from "@/lib/db/messages";
import { runConversationTurn } from "@/lib/agents/runConversationTurn";
import type { Channel } from "@/lib/supabase/types";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { tenant_id, channel, external_user_id, display_name, message } = body as {
    tenant_id?: string;
    channel?: Channel;
    external_user_id?: string;
    display_name?: string;
    message?: string;
  };

  if (!tenant_id || !channel || !external_user_id || !message) {
    return NextResponse.json(
      { error: "tenant_id, channel, external_user_id, and message are required" },
      { status: 400 }
    );
  }

  try {
    const db = supabaseAdmin();
    const customer = await getOrCreateCustomerByChannel(db, tenant_id, channel, external_user_id, display_name);
    const conversation = await getOrCreateOpenConversation(db, tenant_id, customer.id, channel);

    // A human has taken this conversation over from the Inbox — the AI
    // must stay quiet until they hand it back, so just log the message.
    if (conversation.human_takeover) {
      await createMessage(db, { tenant_id, conversation_id: conversation.id, sender: "customer", content: message });
      return NextResponse.json({
        reply: "",
        tool_calls: [],
        customer_id: customer.id,
        conversation_id: conversation.id,
        human_takeover: true,
      });
    }

    const result = await runConversationTurn(db, tenant_id, conversation.id, customer.id, message);

    return NextResponse.json({
      reply: result.reply,
      tool_calls: result.toolCalls,
      images: result.images,
      customer_id: customer.id,
      conversation_id: conversation.id,
    });
  } catch (err) {
    const messageText = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: messageText }, { status: 500 });
  }
}
