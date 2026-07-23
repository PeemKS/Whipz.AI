import type { ChannelAdapter } from "@/lib/channels/types";
import {
  metaAuthorizeUrl,
  exchangeMetaCodeForPage,
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
    return metaAuthorizeUrl(
      state,
      redirectUri,
      "pages_show_list,pages_manage_metadata,instagram_basic,instagram_manage_messages"
    );
  },

  async exchangeCode(code, redirectUri) {
    const { page_id, page_access_token } = await exchangeMetaCodeForPage(code, redirectUri);
    const igAccountId = await getInstagramBusinessAccountId(page_id, page_access_token);
    if (!igAccountId) {
      throw new Error("This Facebook Page has no linked Instagram Business Account.");
    }
    // The linked Page's access token is what authenticates IG messaging calls too.
    return { external_page_id: igAccountId, access_token: page_access_token };
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
