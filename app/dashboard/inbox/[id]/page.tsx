import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverAuth";
import { getConversation } from "@/lib/db/conversations";
import { getCustomer } from "@/lib/db/customers";
import { listMessages } from "@/lib/db/messages";
import { listOrdersForCustomer } from "@/lib/db/orders";
import { getMembershipTier } from "@/lib/db/membershipTiers";
import { sendHumanReplyAction, resumeAiAction } from "@/app/dashboard/inbox/actions";
import { getT } from "@/lib/i18n/getT";
import { getLocale } from "@/lib/i18n/getLocale";
import { format } from "@/lib/i18n/format";
import { formatDate } from "@/lib/i18n/formatDate";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { MessageBubble } from "@/components/ui/MessageBubble";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { ChannelBadge } from "@/lib/channels/channelIcon";

export default async function InboxThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await supabaseServerAuth();
  const t = await getT();
  const locale = await getLocale();
  const c = t.customers;

  const conversation = await getConversation(db, id);
  if (!conversation) notFound();

  const [customer, messages] = await Promise.all([
    getCustomer(db, conversation.customer_id),
    listMessages(db, id, 100),
  ]);

  const [orders, tier] = await Promise.all([
    listOrdersForCustomer(db, conversation.customer_id),
    customer?.membership_tier_id ? getMembershipTier(db, customer.membership_tier_id) : Promise.resolve(null),
  ]);

  const customerName = customer?.display_name ?? t.inbox.unknownCustomer;

  return (
    <div className="flex h-full min-h-0">
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        <div className="px-4 py-3 border-b border-zinc-100 flex items-center gap-3">
          <Avatar name={customer?.display_name} avatarUrl={customer?.avatar_url} size={36} />
          <div className="min-w-0 flex-1">
            <Link href={`/dashboard/customers/${conversation.customer_id}`} className="font-medium text-sm hover:underline">
              {customerName}
            </Link>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <ChannelBadge channel={conversation.channel} size={14} />
              <span className="capitalize">{conversation.channel}</span>
              <span>·</span>
              <span>{conversation.status === "open" ? t.inbox.open : t.inbox.closed}</span>
            </div>
          </div>
          {conversation.human_takeover && (
            <form action={resumeAiAction} className="shrink-0">
              <input type="hidden" name="conversation_id" value={conversation.id} />
              <Button type="submit" variant="secondary" size="sm">
                {t.inbox.resumeAi}
              </Button>
            </form>
          )}
        </div>

        {conversation.human_takeover && (
          <div className="px-4 py-2 bg-amber-50 text-xs text-amber-700 border-b border-amber-100">
            {conversation.handoff_reason
              ? `${t.inbox.autoHandoffBanner} (${conversation.handoff_reason.split(",").join(", ")})`
              : t.inbox.takeoverBanner}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && <p className="text-sm text-zinc-500">{t.inbox.noMessages}</p>}
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              sender={message.sender}
              content={message.content}
              customerName={customer?.display_name}
              customerAvatarUrl={customer?.avatar_url}
            />
          ))}
        </div>

        <form action={sendHumanReplyAction} className="border-t border-zinc-100 p-3 flex items-end gap-2">
          <input type="hidden" name="conversation_id" value={conversation.id} />
          <Textarea name="content" required rows={1} placeholder={t.inbox.replyPlaceholder} className="flex-1 resize-none" />
          <Button type="submit">{t.inbox.send}</Button>
        </form>
      </div>

      <div className="w-72 shrink-0 border-l border-zinc-100 overflow-y-auto p-4 space-y-5">
        <div className="flex flex-col items-center text-center">
          <Avatar name={customer?.display_name} avatarUrl={customer?.avatar_url} size={56} className="text-lg" />
          <p className="font-medium text-sm mt-2 truncate max-w-full">{customerName}</p>
          {customer && (
            <p className="text-xs text-zinc-400 mt-0.5">
              {t.inbox.memberSince} {formatDate(customer.created_at, locale)}
            </p>
          )}
          <Link
            href={`/dashboard/customers/${conversation.customer_id}`}
            className="text-xs text-violet-600 hover:underline mt-2"
          >
            {t.inbox.viewFullProfile}
          </Link>
        </div>

        <div>
          <h3 className="text-xs font-medium text-zinc-500 mb-2">{c.profile}</h3>
          <dl className="text-sm space-y-1.5">
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-400 shrink-0">{c.email}</dt>
              <dd className="truncate">{customer?.email ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-400 shrink-0">{c.phone}</dt>
              <dd className="truncate">{customer?.phone ?? "—"}</dd>
            </div>
          </dl>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-zinc-500">{c.loyalty}</h3>
            {tier && <Badge variant="neutral">{tier.name}</Badge>}
          </div>
          <dl className="text-sm space-y-1.5">
            <div className="flex justify-between">
              <dt className="text-zinc-400">{c.points}</dt>
              <dd>{customer?.loyalty_points ?? 0}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-400">{c.lifetimeSpend}</dt>
              <dd>{customer?.total_spent ?? 0}</dd>
            </div>
          </dl>
        </div>

        <div>
          <h3 className="text-xs font-medium text-zinc-500 mb-2">{c.orders}</h3>
          <p className="text-sm">{format(c.ordersCount, { count: orders.length })}</p>
        </div>

        {customer?.notes && (
          <div>
            <h3 className="text-xs font-medium text-zinc-500 mb-2">{c.notes}</h3>
            <p className="text-xs text-zinc-600 whitespace-pre-wrap">{customer.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
