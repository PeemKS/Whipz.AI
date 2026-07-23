import type { ChannelAdapter } from "@/lib/channels/types";
import {
  metaAuthorizeUrl,
  fetchMetaUserPages,
  subscribeMetaPageToWebhooks,
  getInstagramBusinessAccountId,
  getInstagramUserProfile,
  verifyMetaSignature,
  parseMetaEvents,
  sendMetaMessage,
} from "@/lib/channels/meta";

export const instagramAdapter: ChannelAdapter = {
  channel: "instagram",
  displayName: "Instagram",
  connectionMethod: "oauth",

  getAuthorizeUrl(state, redirectUri) {
    // business_management: Pages that live inside a Business Portfolio
    // aren't returned by /me/accounts without it — see fetchMetaUserPages.
    return metaAuthorizeUrl(
      state,
      redirectUri,
      "pages_show_list,pages_manage_metadata,instagram_basic,instagram_manage_messages,business_management"
    );
  },

  // The picker still lists Facebook Pages (Instagram messaging is
  // authenticated via the linked Page's token) — resolving to the
  // actual IG Business Account id happens at finalize time, once a
  // specific Page has been chosen.
  async listPickableTargets(code, redirectUri) {
    return fetchMetaUserPages(code, redirectUri);
  },

  async finalizeTarget(target) {
    const igAccountId = await getInstagramBusinessAccountId(target.id, target.access_token);
    if (!igAccountId) {
      throw new Error("This Facebook Page has no linked Instagram Business Account.");
    }
    await subscribeMetaPageToWebhooks(target.id, target.access_token);
    // The linked Page's access token is what authenticates IG messaging calls too.
    return { external_page_id: igAccountId, access_token: target.access_token };
  },

  verifyWebhookSignature(rawBody, headers, webhookSecret) {
    return verifyMetaSignature(rawBody, headers, webhookSecret);
  },

  parseEvents(payload) {
    return parseMetaEvents(payload);
  },

  async sendMessage(accessToken, externalUserId, text) {
    await sendMetaMessage(accessToken, externalUserId, text);
  },

  async getUserProfile(externalUserId, accessToken) {
    return getInstagramUserProfile(externalUserId, accessToken);
  },
};
