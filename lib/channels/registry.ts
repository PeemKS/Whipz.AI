import type { Channel } from "@/lib/supabase/types";
import type { ChannelAdapter } from "@/lib/channels/types";
import { facebookAdapter } from "@/lib/channels/facebook";
import { instagramAdapter } from "@/lib/channels/instagram";
import { lineAdapter } from "@/lib/channels/line";
import { tiktokAdapter } from "@/lib/channels/tiktok";

export const CONNECTABLE_CHANNELS = ["facebook", "instagram", "line", "tiktok"] as const;
export type ConnectableChannel = (typeof CONNECTABLE_CHANNELS)[number];

const registry: Record<ConnectableChannel, ChannelAdapter> = {
  facebook: facebookAdapter,
  instagram: instagramAdapter,
  line: lineAdapter,
  tiktok: tiktokAdapter,
};

export function getChannelAdapter(channel: Channel): ChannelAdapter | null {
  if (channel in registry) return registry[channel as ConnectableChannel];
  return null;
}
