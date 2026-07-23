import type { ChannelAdapter } from "@/lib/channels/types";
import {
  metaAuthorizeUrl,
  fetchMetaUserPages,
  subscribeMetaPageToWebhooks,
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

  async listPickableTargets(code, redirectUri) {
    return fetchMetaUserPages(code, redirectUri);
  },

  async finalizeTarget(target) {
    await subscribeMetaPageToWebhooks(target.id, target.access_token);
    return { external_page_id: target.id, access_token: target.access_token };
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
