import { createHmac, timingSafeEqual } from "node:crypto";
import type { ChannelAdapter } from "@/lib/channels/types";

// TikTok Shop's Partner API is the least publicly standardized of the
// four — endpoints/params below follow the general shape of TikTok
// Shop's OAuth + Partner Center docs, but exact URLs and the
// customer-chat/webhook-signature details are NOT verified against a
// live sandbox (no partner access to test against). Treat this as a
// starting point to adjust once real Partner Center docs/access are
// available, not a confirmed-working integration.

function tiktokAppKey(): string {
  const key = process.env.TIKTOK_APP_KEY;
  if (!key) throw new Error("Missing TIKTOK_APP_KEY env var.");
  return key;
}

function tiktokAppSecret(): string {
  const secret = process.env.TIKTOK_APP_SECRET;
  if (!secret) throw new Error("Missing TIKTOK_APP_SECRET env var.");
  return secret;
}

export const tiktokAdapter: ChannelAdapter = {
  channel: "tiktok",
  displayName: "TikTok Shop",
  connectionMethod: "oauth",

  getAuthorizeUrl(state, redirectUri) {
    const params = new URLSearchParams({
      app_key: tiktokAppKey(),
      state,
      redirect_uri: redirectUri,
    });
    return `https://auth.tiktok-shops.com/oauth/authorize?${params.toString()}`;
  },

  async exchangeCode(code) {
    const params = new URLSearchParams({
      app_key: tiktokAppKey(),
      app_secret: tiktokAppSecret(),
      auth_code: code,
      grant_type: "authorized_code",
    });
    const res = await fetch(`https://auth.tiktok-shops.com/api/v2/token/get?${params.toString()}`);
    if (!res.ok) throw new Error(`TikTok token exchange failed: ${await res.text()}`);
    const data = (await res.json()) as {
      data?: { access_token: string; seller_name?: string; shop_id?: string };
    };
    const token = data.data;
    if (!token?.access_token) throw new Error(`Unexpected TikTok token response: ${JSON.stringify(data)}`);
    return { external_page_id: token.shop_id ?? token.seller_name ?? "unknown-shop", access_token: token.access_token };
  },

  verifyWebhookSignature(rawBody, headers, webhookSecret) {
    // Best-effort HMAC-SHA256 check — confirm the actual header name
    // and algorithm against real TikTok Shop webhook docs once available.
    const signatureHeader = headers.get("x-tts-signature") ?? headers.get("x-tiktok-signature");
    if (!signatureHeader) return false;

    const expected = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
    const a = Buffer.from(signatureHeader);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  },

  parseEvents(payload) {
    // Placeholder shape — adjust once real TikTok Shop chat webhook
    // payloads are available to inspect.
    const body = payload as {
      shop_id?: string;
      messages?: { sender_id?: string; content?: string }[];
    };
    const events: { external_page_id: string; external_user_id: string; text: string }[] = [];
    for (const message of body.messages ?? []) {
      if (!message.sender_id || !message.content) continue;
      events.push({
        external_page_id: body.shop_id ?? "unknown-shop",
        external_user_id: message.sender_id,
        text: message.content,
      });
    }
    return events;
  },

  async sendMessage(accessToken, externalUserId, text) {
    // Placeholder endpoint — TikTok Shop's seller-to-buyer chat send
    // API isn't in the general public docs; confirm against Partner
    // Center once approved.
    const res = await fetch("https://open-api.tiktokglobalshop.com/api/chat/send_message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-tts-access-token": accessToken,
      },
      body: JSON.stringify({ recipient_id: externalUserId, content: text }),
    });
    if (!res.ok) throw new Error(`Sending TikTok Shop message failed: ${await res.text()}`);
  },
};
