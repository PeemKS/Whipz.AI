import type { Channel } from "@/lib/supabase/types";

export interface NormalizedEvent {
  external_page_id: string;
  external_user_id: string;
  text: string;
  display_name?: string;
}

interface OAuthAdapter {
  connectionMethod: "oauth";
  getAuthorizeUrl(state: string, redirectUri: string): string;
  // Single-target channels implement this: one code exchange, one result.
  exchangeCode?(
    code: string,
    redirectUri: string
  ): Promise<{ external_page_id: string; access_token: string; webhook_secret?: string }>;
  // Multi-target channels (Meta: an account can manage several Pages)
  // implement this pair instead, so the OAuth callback can show a picker
  // rather than guessing which target the user wanted. When both are
  // present the callback route prefers this path over exchangeCode.
  listPickableTargets?(code: string, redirectUri: string): Promise<{ id: string; name: string; access_token: string }[]>;
  finalizeTarget?(target: {
    id: string;
    access_token: string;
  }): Promise<{ external_page_id: string; access_token: string; webhook_secret?: string }>;
}

interface ManualAdapter {
  connectionMethod: "manual";
  // Field names the dashboard form collects and passes through to
  // connectManualChannelAction — e.g. LINE's Channel ID/Secret/Access Token.
  manualFields: { name: string; label: string; type?: "password" | "text" }[];
  parseManualFields(fields: Record<string, string>): {
    external_page_id: string;
    access_token: string;
    webhook_secret?: string;
  };
}

// Adapters only ever see already-decrypted secrets (the caller — OAuth
// callback route, webhook route, or manual-connect action — handles
// encryption/decryption via lib/crypto/tenantKey); adapters stay
// encryption-agnostic.
export type ChannelAdapter = (OAuthAdapter | ManualAdapter) & {
  channel: Channel;
  displayName: string;
  verifyWebhookSignature(rawBody: string, headers: Headers, webhookSecret: string): boolean;
  parseEvents(payload: unknown): NormalizedEvent[];
  sendMessage(accessToken: string, externalUserId: string, text: string): Promise<void>;
  // Webhook events on some channels (Meta) only carry an opaque user id —
  // this fetches the name/photo via that channel's own API. Optional:
  // channels whose webhook already includes a display name skip it.
  getUserProfile?(externalUserId: string, accessToken: string): Promise<{ name: string | null; avatar_url: string | null } | null>;
};
