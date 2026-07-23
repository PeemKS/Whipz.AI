import { MessageCircle, MessageSquare, Share2, Smartphone, FlaskConical, type LucideIcon } from "lucide-react";
import type { Channel } from "@/lib/supabase/types";

export const CHANNEL_ICON: Record<Channel, LucideIcon> = {
  facebook: MessageCircle,
  instagram: MessageSquare,
  line: Share2,
  tiktok: Smartphone,
  playground: FlaskConical,
};

export const CHANNEL_COLOR: Record<Channel, string> = {
  facebook: "bg-blue-600 text-white",
  instagram: "bg-pink-500 text-white",
  line: "bg-emerald-500 text-white",
  tiktok: "bg-zinc-900 text-white",
  playground: "bg-amber-500 text-white",
};

export function ChannelBadge({ channel, size = 18, className }: { channel: Channel; size?: number; className?: string }) {
  const Icon = CHANNEL_ICON[channel];
  return (
    <span
      title={channel}
      className={`rounded-full flex items-center justify-center shrink-0 ${CHANNEL_COLOR[channel]} ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      <Icon size={size * 0.6} strokeWidth={2.5} />
    </span>
  );
}
