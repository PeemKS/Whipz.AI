import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Shared by facebook.ts and instagram.ts — both ride on the same Meta
// App / Graph API and OAuth flow (Facebook Login for Business), just
// with a different resulting page-vs-IG-account id.

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

function metaAppId(): string {
  const id = process.env.META_APP_ID;
  if (!id) throw new Error("Missing META_APP_ID env var.");
  return id;
}

function metaAppSecret(): string {
  const secret = process.env.META_APP_SECRET;
  if (!secret) throw new Error("Missing META_APP_SECRET env var.");
  return secret;
}

export function metaAuthorizeUrl(state: string, redirectUri: string, scope: string): string {
  const params = new URLSearchParams({
    client_id: metaAppId(),
    redirect_uri: redirectUri,
    state,
    scope,
  });
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
}

// Exchanges the OAuth code for a user token, then lists every Page the
// user manages (with each Page's own Access Token) — no auto-picking.
// A business account with multiple Pages gets a picker UI (see
// app/dashboard/settings/channels/pick) instead of silently taking
// whichever Page Graph API happens to list first.
export async function fetchMetaUserPages(
  code: string,
  redirectUri: string
): Promise<{ id: string; name: string; access_token: string }[]> {
  const tokenParams = new URLSearchParams({
    client_id: metaAppId(),
    redirect_uri: redirectUri,
    client_secret: metaAppSecret(),
    code,
  });
  const tokenRes = await fetch(`${GRAPH_BASE}/oauth/access_token?${tokenParams.toString()}`);
  if (!tokenRes.ok) throw new Error(`Meta token exchange failed: ${await tokenRes.text()}`);
  const { access_token: userAccessToken } = (await tokenRes.json()) as { access_token: string };

  const pagesRes = await fetch(`${GRAPH_BASE}/me/accounts?access_token=${userAccessToken}`);
  if (!pagesRes.ok) throw new Error(`Fetching Pages failed: ${await pagesRes.text()}`);
  const { data } = (await pagesRes.json()) as { data: { id: string; access_token: string; name: string }[] };
  return data;
}

// Having the app-level Webhooks product configured isn't enough — each
// Page has to individually opt in to push events to this app, or Meta
// just silently never calls the webhook for it. Called once the caller
// knows which specific Page was chosen (see fetchMetaUserPages above).
export async function subscribeMetaPageToWebhooks(pageId: string, pageAccessToken: string): Promise<void> {
  const subscribeRes = await fetch(
    `${GRAPH_BASE}/${pageId}/subscribed_apps?subscribed_fields=messages,messaging_postbacks&access_token=${pageAccessToken}`,
    { method: "POST" }
  );
  if (!subscribeRes.ok) throw new Error(`Subscribing Page to webhooks failed: ${await subscribeRes.text()}`);
}

// The Messenger webhook event only ever carries the sender's
// page-scoped ID (PSID) — their name and photo need this separate
// Graph API call. Only worth doing the first time we see a PSID (see
// getOrCreateCustomerByChannel's lazy fetchProfile), not on every message.
export async function getMetaUserProfile(
  psid: string,
  pageAccessToken: string
): Promise<{ name: string | null; avatar_url: string | null } | null> {
  const res = await fetch(`${GRAPH_BASE}/${psid}?fields=first_name,last_name,profile_pic&access_token=${pageAccessToken}`);
  if (!res.ok) {
    console.error(`Meta user profile lookup failed for ${psid}: ${await res.text()}`);
    return null;
  }
  const data = (await res.json()) as { first_name?: string; last_name?: string; profile_pic?: string };
  const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || null;
  return { name, avatar_url: data.profile_pic ?? null };
}

// Same idea as getMetaUserProfile but for an Instagram-scoped ID (IGSID)
// — Instagram's Messaging profile fields are name/profile_pic, not
// Facebook's first_name/last_name.
export async function getInstagramUserProfile(
  igsid: string,
  pageAccessToken: string
): Promise<{ name: string | null; avatar_url: string | null } | null> {
  const res = await fetch(`${GRAPH_BASE}/${igsid}?fields=name,profile_pic&access_token=${pageAccessToken}`);
  if (!res.ok) {
    console.error(`Instagram user profile lookup failed for ${igsid}: ${await res.text()}`);
    return null;
  }
  const data = (await res.json()) as { name?: string; profile_pic?: string };
  return { name: data.name ?? null, avatar_url: data.profile_pic ?? null };
}

export async function getInstagramBusinessAccountId(pageId: string, pageAccessToken: string): Promise<string | null> {
  const res = await fetch(
    `${GRAPH_BASE}/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`
  );
  if (!res.ok) throw new Error(`Fetching Instagram business account failed: ${await res.text()}`);
  const data = (await res.json()) as { instagram_business_account?: { id: string } };
  return data.instagram_business_account?.id ?? null;
}

// Meta signs the whole webhook payload with the App Secret (not a
// per-connection secret) — the caller passes process.env.META_APP_SECRET
// as `webhookSecret` for both facebook and instagram.
export function verifyMetaSignature(rawBody: string, headers: Headers, webhookSecret: string): boolean {
  const signatureHeader = headers.get("x-hub-signature-256");
  if (!signatureHeader?.startsWith("sha256=")) return false;

  const expected = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  const provided = signatureHeader.slice("sha256=".length);

  const a = Buffer.from(provided, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface MetaMessagingEvent {
  sender: { id: string };
  message?: { text?: string };
}

export interface MetaWebhookPayload {
  object: string;
  entry: { id: string; messaging?: MetaMessagingEvent[] }[];
}

export function parseMetaEvents(payload: unknown) {
  const body = payload as MetaWebhookPayload;
  const events: { external_page_id: string; external_user_id: string; text: string }[] = [];
  for (const entry of body.entry ?? []) {
    for (const messaging of entry.messaging ?? []) {
      const text = messaging.message?.text;
      if (!text) continue;
      events.push({ external_page_id: entry.id, external_user_id: messaging.sender.id, text });
    }
  }
  return events;
}

export async function sendMetaMessage(accessToken: string, externalUserId: string, text: string): Promise<void> {
  const res = await fetch(`${GRAPH_BASE}/me/messages?access_token=${accessToken}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: externalUserId },
      message: { text },
      messaging_type: "RESPONSE",
    }),
  });
  if (!res.ok) throw new Error(`Sending Meta message failed: ${await res.text()}`);
}
