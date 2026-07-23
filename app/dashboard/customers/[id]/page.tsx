import { notFound } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverAuth";
import { getCustomer } from "@/lib/db/customers";
import { listConversationsForCustomer } from "@/lib/db/conversations";
import { listMessages } from "@/lib/db/messages";
import { listOrdersForCustomer } from "@/lib/db/orders";
import { getMembershipTier } from "@/lib/db/membershipTiers";
import { listLoyaltyTransactions } from "@/lib/db/loyaltyTransactions";
import { updateNotesAction, regenerateSummaryAction, updateContactInfoAction } from "@/app/dashboard/customers/actions";
import { getT } from "@/lib/i18n/getT";
import { format } from "@/lib/i18n/format";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { MessageBubble } from "@/components/ui/MessageBubble";
import { Toggle } from "@/components/ui/Toggle";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await supabaseServerAuth();
  const customer = await getCustomer(db, id);
  if (!customer) notFound();
  const t = await getT();
  const c = t.customers;

  const [conversations, orders, tier, loyaltyTransactions] = await Promise.all([
    listConversationsForCustomer(db, id),
    listOrdersForCustomer(db, id),
    customer.membership_tier_id ? getMembershipTier(db, customer.membership_tier_id) : Promise.resolve(null),
    listLoyaltyTransactions(db, id, 5),
  ]);
  const latestConversation = conversations[0];
  const messages = latestConversation ? await listMessages(db, latestConversation.id, 50) : [];

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-1 space-y-4">
        <Card padding="sm">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-medium">{c.profile}</h2>
            <span className="text-xs text-zinc-500">{format(c.ordersCount, { count: orders.length })}</span>
          </div>
          <form action={updateContactInfoAction} className="space-y-2">
            <input type="hidden" name="id" value={customer.id} />
            <div>
              <label className="text-xs text-zinc-500">{c.name}</label>
              <Input name="display_name" defaultValue={customer.display_name ?? ""} />
            </div>
            <div>
              <label className="text-xs text-zinc-500">{c.email}</label>
              <Input name="email" type="email" defaultValue={customer.email ?? ""} />
            </div>
            <div>
              <label className="text-xs text-zinc-500">{c.phone}</label>
              <Input name="phone" defaultValue={customer.phone ?? ""} />
            </div>
            <div>
              <label className="text-xs text-zinc-500">{c.birthday}</label>
              <Input name="birth_date" type="date" defaultValue={customer.birth_date ?? ""} />
            </div>
            <div>
              <label className="text-xs text-zinc-500">{c.shippingAddress}</label>
              <Textarea name="shipping_address" rows={2} defaultValue={customer.shipping_address ?? ""} />
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Toggle name="marketing_consent" defaultChecked={customer.marketing_consent} autoSubmit={false} />
              <span>{c.marketingConsent}</span>
            </div>
            <Button type="submit" variant="secondary" size="sm">
              {c.saveProfile}
            </Button>
          </form>
        </Card>

        <Card padding="sm">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-medium">{c.loyalty}</h2>
            {tier && <Badge variant="neutral">{tier.name}</Badge>}
          </div>
          <dl className="text-sm space-y-1 text-zinc-600 mb-3">
            <div className="flex justify-between">
              <dt>{c.points}</dt>
              <dd>{customer.loyalty_points}</dd>
            </div>
            <div className="flex justify-between">
              <dt>{c.lifetimeSpend}</dt>
              <dd>{customer.total_spent}</dd>
            </div>
          </dl>
          {loyaltyTransactions.length > 0 && (
            <ul className="text-xs space-y-1 border-t border-zinc-100 pt-2">
              {loyaltyTransactions.map((tx) => (
                <li key={tx.id} className="flex justify-between text-zinc-500">
                  <span className="truncate">{tx.reason}</span>
                  <span className={tx.points >= 0 ? "text-green-600" : "text-zinc-500"}>
                    {tx.points >= 0 ? "+" : ""}
                    {tx.points}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card padding="sm">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-medium">{c.notes}</h2>
            <form action={regenerateSummaryAction}>
              <input type="hidden" name="id" value={customer.id} />
              <Button type="submit" variant="secondary" size="sm">
                {c.aiSummarize}
              </Button>
            </form>
          </div>
          <form action={updateNotesAction} className="space-y-2">
            <input type="hidden" name="id" value={customer.id} />
            <Textarea name="notes" rows={4} defaultValue={customer.notes ?? ""} />
            <Button type="submit" variant="secondary" size="sm">
              {c.saveNotes}
            </Button>
          </form>
        </Card>

        <Card padding="sm">
          <h2 className="font-medium mb-2">{c.orders}</h2>
          {orders.length === 0 && <p className="text-sm text-zinc-500">{c.noOrders}</p>}
          <ul className="text-sm space-y-1">
            {orders.map((order) => (
              <li key={order.id} className="flex justify-between">
                <span>{order.status}</span>
                <span>{order.total_amount}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card padding="sm" className="col-span-2">
        <h2 className="font-medium mb-3">
          {c.conversation} {latestConversation ? `(${latestConversation.channel})` : ""}
        </h2>
        <div className="space-y-3">
          {messages.length === 0 && <p className="text-sm text-zinc-500">{c.noMessages}</p>}
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              sender={message.sender}
              content={message.content}
              customerName={customer.display_name}
              customerAvatarUrl={customer.avatar_url}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}
