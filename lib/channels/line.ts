import { createHmac, timingSafeEqual } from "node:crypto";
import type { ChannelAdapter } from "@/lib/channels/types";

// LINE Messaging API channels aren't connected via a consumer OAuth
// redirect the way Meta's Business Login works — each business
// creates their own Messaging API channel in the LINE Developers
// Console and hands over its Channel ID / Channel Secret / a
// long-lived Channel Access Token directly. That's why this is a
// "manual" adapter rather than "oauth".
export const lineAdapter: ChannelAdapter = {
  channel: "line",
  displayName: "LINE",
  connectionMethod: "manual",
  manualFields: [
    { name: "channel_id", label: "Channel ID" },
    { name: "channel_secret", label: "Channel Secret", type: "password" },
    { name: "channel_access_token", label: "Channel Access Token", type: "password" },
  ],

  parseManualFields(fields) {
    return {
      external_page_id: fields.channel_id,
      access_token: fields.channel_access_token,
      webhook_secret: fields.channel_secret,
    };
  },

  verifyWebhookSignature(rawBody, headers, webhookSecret) {
    const signatureHeader = headers.get("x-line-signature");
    if (!signatureHeader) return false;

    const expected = createHmac("sha256", webhookSecret).update(rawBody).digest("base64");
    const a = Buffer.from(signatureHeader);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  },

  parseEvents(payload) {
    const body = payload as {
      destination: string;
      events: { type: string; source?: { userId?: string }; message?: { type: string; text?: string } }[];
    };
    const events: { external_page_id: string; external_user_id: string; text: string }[] = [];
    for (const event of body.events ?? []) {
      if (event.type !== "message" || event.message?.type !== "text" || !event.message.text) continue;
      const userId = event.source?.userId;
      if (!userId) continue;
      events.push({ external_page_id: body.destination, external_user_id: userId, text: event.message.text });
    }
    return events;
  },

  async sendMessage(accessToken, externalUserId, text) {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ to: externalUserId, messages: [{ type: "text", text }] }),
    });
    if (!res.ok) throw new Error(`Sending LINE message failed: ${await res.text()}`);
  },
};
