import Link from "next/link";
import { getCurrentTenant } from "@/lib/dashboard/currentTenant";
import { supabaseServerAuth } from "@/lib/supabase/serverAuth";
import { listConversationsWithCustomer } from "@/lib/db/conversations";
import { listLatestMessagePerConversation } from "@/lib/db/messages";
import { getT } from "@/lib/i18n/getT";
import { format } from "@/lib/i18n/format";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ChannelBadge } from "@/lib/channels/channelIcon";

function timeAgo(iso: string, t: Dictionary["inbox"]): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return t.justNow;
  if (minutes < 60) return format(t.minutesAgo, { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return format(t.hoursAgo, { n: hours });
  const days = Math.floor(hours / 24);
  return format(t.daysAgo, { n: days });
}

export default async function InboxLayout({ children }: { children: React.ReactNode }) {
  const { tenant } = await getCurrentTenant();
  if (!tenant) return null;
  const db = await supabaseServerAuth();
  const t = await getT();
  const i = t.inbox;

  const conversations = await listConversationsWithCustomer(db, tenant.id);
  const latestMessages = await listLatestMessagePerConversation(
    db,
    conversations.map((c) => c.id)
  );

  return (
    <div className="grid grid-cols-4 gap-4 h-full min-h-0">
      <Card padding="none" className="col-span-1 min-h-0 overflow-y-auto">
        {conversations.length === 0 && <p className="text-sm text-zinc-500 p-4">{i.empty}</p>}
        {conversations.map((c) => {
          const last = latestMessages[c.id];
          return (
            <Link
              key={c.id}
              href={`/dashboard/inbox/${c.id}`}
              className="flex items-start gap-3 px-4 py-3 border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50"
            >
              <Avatar name={c.customer_display_name} avatarUrl={c.customer_avatar_url} size={36} className="mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm truncate">
                    {c.customer_display_name ?? i.unknownCustomer}
                  </span>
                  <ChannelBadge channel={c.channel} />
                </div>
                <p className="text-xs text-zinc-500 truncate mt-0.5">
                  {last ? `${last.sender === "bot" || last.sender === "human" ? "You: " : ""}${last.content}` : i.noMessages}
                </p>
                <div className="flex items-center justify-between mt-1 gap-2">
                  <span className="text-[10px] text-zinc-400 shrink-0">{timeAgo(c.updated_at, i)}</span>
                  {c.human_takeover && c.handoff_reason ? (
                    <Badge variant="destructive" size="sm" className="shrink-0">
                      {i.needsAttention}
                    </Badge>
                  ) : c.status === "open" ? (
                    <span className="text-[10px] text-green-600">{i.open}</span>
                  ) : (
                    <span className="text-[10px] text-zinc-400">{i.closed}</span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </Card>
      <Card padding="none" className="col-span-3 min-h-0 overflow-hidden">
        {children}
      </Card>
    </div>
  );
}
