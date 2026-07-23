import type { ChannelAdapter } from "@/lib/channels/types";
import {
  metaAuthorizeUrl,
  exchangeMetaCodeForPage,
  verifyMetaSignature,
  parseMetaEvents,
  sendMetaMessage,
  getMetaUserProfile,
} from "@/lib/channels/meta";

export const facebookAdapter: ChannelAdapter = {
  channel: "facebook",
  displayName: "Facebook Messenger",
  connectionMethod: "oauth",

  getAuthorizeUrl(state, redirectUri) {
    return metaAuthorizeUrl(state, redirectUri, "pages_show_list,pages_messaging,pages_manage_metadata");
  },

  async exchangeCode(code, redirectUri) {
    const { page_id, page_access_token } = await exchangeMetaCodeForPage(code, redirectUri);
    return { external_page_id: page_id, access_token: page_access_token };
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
    return getMetaUserProfile(externalUserId, accessToken);
  },
};
