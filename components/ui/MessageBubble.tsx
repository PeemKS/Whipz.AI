import type { MessageSender } from "@/lib/supabase/types";
import { Avatar, AgentAvatar } from "@/components/ui/Avatar";

const SENDER_STYLE: Record<MessageSender, string> = {
  customer: "bg-zinc-100",
  bot: "bg-violet-50 ml-auto text-right",
  human: "bg-emerald-50 ml-auto text-right",
};

export function MessageBubble({
  sender,
  content,
  customerName,
  customerAvatarUrl,
}: {
  sender: MessageSender;
  content: string;
  customerName?: string | null;
  customerAvatarUrl?: string | null;
}) {
  const isCustomer = sender === "customer";
  return (
    <div className={`flex items-end gap-2 ${isCustomer ? "" : "flex-row-reverse"}`}>
      {isCustomer ? (
        <Avatar name={customerName} avatarUrl={customerAvatarUrl} size={28} />
      ) : (
        <AgentAvatar human={sender === "human"} size={28} />
      )}
      <div className={`text-sm rounded-2xl px-3.5 py-2 max-w-lg ${SENDER_STYLE[sender]}`}>{content}</div>
    </div>
  );
}
