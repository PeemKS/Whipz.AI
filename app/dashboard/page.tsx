import Link from "next/link";
import {
  ShoppingCart,
  XCircle,
  UserPlus,
  CheckCircle2,
  MessageCircle,
  MessageSquare,
  Share2,
  Smartphone,
  FlaskConical,
  Inbox,
  Package,
  Users,
  Gift,
  Settings,
  Sparkles,
  AlertTriangle,
  UserX,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import { getCurrentTenant } from "@/lib/dashboard/currentTenant";
import { supabaseServerAuth } from "@/lib/supabase/serverAuth";
import { listCustomers } from "@/lib/db/customers";
import { listOrders } from "@/lib/db/orders";
import { listProducts } from "@/lib/db/products";
import { listConversations } from "@/lib/db/conversations";
import { listChannelConnections } from "@/lib/db/channelConnections";
import { listAgents } from "@/lib/db/agents";
import { listMembershipTiers } from "@/lib/db/membershipTiers";
import { computeLifecycleStage } from "@/lib/lifecycle/stage";
import { summarizeClv } from "@/lib/lifecycle/clv";
import { MarketingFunnel, type FunnelStage } from "@/app/dashboard/MarketingFunnel";
import { OrdersTrendChart } from "@/app/dashboard/OrdersTrendChart";
import { StatisticsToggle } from "@/app/dashboard/StatisticsToggle";
import { DonutRing } from "@/app/dashboard/DonutRing";
import { ChannelBreakdown, type ChannelSegment } from "@/app/dashboard/ChannelBreakdown";
import { LifecycleBreakdown, type LifecycleSegment } from "@/app/dashboard/LifecycleBreakdown";
import { FunnelLifecycleToggle } from "@/app/dashboard/FunnelLifecycleToggle";
import { RevenueByDayBar } from "@/app/dashboard/RevenueByDayBar";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getT } from "@/lib/i18n/getT";
import { getLocale } from "@/lib/i18n/getLocale";
import { format } from "@/lib/i18n/format";
import { formatDate } from "@/lib/i18n/formatDate";
import type { LifecycleStage } from "@/lib/supabase/types";

const LOW_STOCK_THRESHOLD = 5;
const TREND_DAYS = 14;
const REVENUE_DAYS = 7;

const CHANNEL_STYLE: Record<string, { icon: typeof MessageCircle; bar: string; chip: string }> = {
  facebook: { icon: MessageCircle, bar: "bg-blue-600", chip: "bg-blue-100 text-blue-600" },
  instagram: { icon: MessageSquare, bar: "bg-pink-500", chip: "bg-pink-100 text-pink-600" },
  line: { icon: Share2, bar: "bg-emerald-500", chip: "bg-emerald-100 text-emerald-600" },
  tiktok: { icon: Smartphone, bar: "bg-zinc-700", chip: "bg-zinc-200 text-zinc-700" },
  playground: { icon: FlaskConical, bar: "bg-amber-500", chip: "bg-amber-100 text-amber-600" },
};

const LIFECYCLE_STYLE: Record<LifecycleStage, { icon: LucideIcon; bar: string; chip: string }> = {
  lead: { icon: UserPlus, bar: "bg-zinc-400", chip: "bg-zinc-100 text-zinc-500" },
  new: { icon: Sparkles, bar: "bg-blue-600", chip: "bg-blue-100 text-blue-600" },
  active: { icon: CheckCircle2, bar: "bg-emerald-500", chip: "bg-emerald-100 text-emerald-600" },
  at_risk: { icon: AlertTriangle, bar: "bg-amber-500", chip: "bg-amber-100 text-amber-600" },
  churned: { icon: UserX, bar: "bg-red-500", chip: "bg-red-100 text-red-600" },
  won_back: { icon: RotateCcw, bar: "bg-violet-500", chip: "bg-violet-100 text-violet-600" },
};

const QUICK_ACTIONS: { href: string; key: "inbox" | "products" | "orders" | "customers" | "loyalty" | "settings"; icon: LucideIcon }[] = [
  { href: "/dashboard/inbox", key: "inbox", icon: Inbox },
  { href: "/dashboard/products", key: "products", icon: Package },
  { href: "/dashboard/orders", key: "orders", icon: ShoppingCart },
  { href: "/dashboard/customers", key: "customers", icon: Users },
  { href: "/dashboard/loyalty", key: "loyalty", icon: Gift },
  { href: "/dashboard/settings", key: "settings", icon: Settings },
];

function formatCurrency(n: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export default async function DashboardOverviewPage() {
  const { tenant } = await getCurrentTenant();
  if (!tenant) return null;
  const db = await supabaseServerAuth();
  const t = await getT();
  const locale = await getLocale();
  const o = t.overview;

  const [customers, orders, products, conversations, channels, agents, tiers] = await Promise.all([
    listCustomers(db, tenant.id),
    listOrders(db, tenant.id),
    listProducts(db, tenant.id),
    listConversations(db, tenant.id),
    listChannelConnections(db, tenant.id),
    listAgents(db, tenant.id),
    listMembershipTiers(db, tenant.id),
  ]);

  const isEmpty = !tenant.llm_model && products.length === 0;

  if (isEmpty) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-amber-50 p-5 text-sm border border-amber-200">
          {o.noLlmConfigured}{" "}
          <Link href="/dashboard/settings" className="underline font-medium">
            {o.setupInSettings}
          </Link>
          .
        </div>
        <Card>
          <h2 className="font-medium mb-2">{o.getStarted}</h2>
          <ol className="text-sm text-zinc-600 list-decimal list-inside space-y-1">
            <li>
              {o.step1}{" "}
              <Link href="/dashboard/settings" className="underline">
                {o.settingsPage}
              </Link>{" "}
              {o.step1End}
            </li>
            <li>
              {o.step2}{" "}
              <Link href="/dashboard/products" className="underline">
                {o.productsPage}
              </Link>{" "}
              {o.step2End}
            </li>
            <li>
              {o.step3}{" "}
              <Link href="/dashboard/playground" className="underline">
                {o.playgroundPage}
              </Link>
              {o.step3End}
            </li>
          </ol>
        </Card>
      </div>
    );
  }

  const paidOrders = orders.filter((order) => order.status === "paid");
  const totalRevenue = paidOrders.reduce((sum, order) => sum + Number(order.total_amount), 0);
  const openConversations = conversations.filter((c) => c.status === "open").length;
  const activeAgents = agents.filter((a) => a.is_active);
  const connectedChannelCount = channels.length;
  const pendingOrders = orders.filter((order) => order.status === "pending").length;
  const fulfillmentRate = orders.length > 0 ? (paidOrders.length / orders.length) * 100 : 0;

  // Week-over-week revenue delta.
  const thisWeekStart = daysAgo(7);
  const lastWeekStart = daysAgo(14);
  const thisWeekRevenue = paidOrders
    .filter((order) => new Date(order.created_at) >= thisWeekStart)
    .reduce((sum, order) => sum + Number(order.total_amount), 0);
  const lastWeekRevenue = paidOrders
    .filter((order) => new Date(order.created_at) >= lastWeekStart && new Date(order.created_at) < thisWeekStart)
    .reduce((sum, order) => sum + Number(order.total_amount), 0);
  const revenueDelta =
    lastWeekRevenue > 0
      ? Math.round(((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100)
      : thisWeekRevenue > 0
        ? 100
        : 0;

  // Weekly (7d) vs monthly (30d) new-customer counts for the toggle card.
  // Order counts are covered by the trend chart below — kept out here to avoid
  // showing the same order-count data twice.
  const weekly = {
    customers: customers.filter((c) => new Date(c.created_at) >= daysAgo(7)).length,
  };
  const monthly = {
    customers: customers.filter((c) => new Date(c.created_at) >= daysAgo(30)).length,
  };

  // Daily order counts for the last TREND_DAYS days, oldest first.
  const dayBuckets = Array.from({ length: TREND_DAYS }, (_, i) => {
    const date = daysAgo(TREND_DAYS - 1 - i);
    date.setHours(0, 0, 0, 0);
    return date;
  });
  const trendData = dayBuckets.map((date) => {
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    const count = orders.filter((order) => {
      const created = new Date(order.created_at);
      return created >= date && created < next;
    }).length;
    return {
      label: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      fullLabel: date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" }),
      count,
    };
  });

  // Daily paid revenue for the last REVENUE_DAYS days — distinct data from
  // the order-count trend above (dollars, not counts).
  const revenueBuckets = Array.from({ length: REVENUE_DAYS }, (_, i) => {
    const date = daysAgo(REVENUE_DAYS - 1 - i);
    date.setHours(0, 0, 0, 0);
    return date;
  });
  const revenueByDay = revenueBuckets.map((date) => {
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    const amount = paidOrders
      .filter((order) => {
        const created = new Date(order.created_at);
        return created >= date && created < next;
      })
      .reduce((sum, order) => sum + Number(order.total_amount), 0);
    return {
      label: date.toLocaleDateString(undefined, { weekday: "short" }),
      fullLabel: date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" }),
      amount,
    };
  });

  // Real conversations-by-channel breakdown for the donut panel's segmented bar.
  const channelCounts = new Map<string, number>();
  for (const c of conversations) {
    channelCounts.set(c.channel, (channelCounts.get(c.channel) ?? 0) + 1);
  }
  const channelSegments: ChannelSegment[] = Object.keys(CHANNEL_STYLE)
    .filter((key) => channelCounts.has(key))
    .map((key) => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      count: channelCounts.get(key) ?? 0,
      barClass: CHANNEL_STYLE[key].bar,
      chipClass: CHANNEL_STYLE[key].chip,
      icon: CHANNEL_STYLE[key].icon,
    }));

  const lowStockProducts = products.filter((p) => p.stock <= LOW_STOCK_THRESHOLD).sort((a, b) => a.stock - b.stock);

  // Customer funnel: each stage is a strict subset of the one before it —
  // everyone who's messaged in, down to who's ordered, paid, and come back.
  const orderedCustomerIds = new Set(orders.map((order) => order.customer_id));
  const paidCustomerIds = new Set(paidOrders.map((order) => order.customer_id));
  const paidOrderCountByCustomer = new Map<string, number>();
  for (const order of paidOrders) {
    paidOrderCountByCustomer.set(order.customer_id, (paidOrderCountByCustomer.get(order.customer_id) ?? 0) + 1);
  }
  const repeatCustomerCount = [...paidOrderCountByCustomer.values()].filter((count) => count >= 2).length;
  const funnelStages: FunnelStage[] = [
    { key: "reached", label: o.funnelReached, count: customers.length },
    { key: "ordered", label: o.funnelOrdered, count: orderedCustomerIds.size },
    { key: "paid", label: o.funnelPaid, count: paidCustomerIds.size },
    { key: "repeat", label: o.funnelRepeat, count: repeatCustomerCount },
  ];

  // Lifecycle-stage distribution + CLV summary (funnel-aware-agent
  // blueprint's "start with" list — cohort grids and NRR need months of
  // history to be meaningful, added later). Computed on read, not
  // cached — see lib/lifecycle/ for the classification rules.
  const ordersByCustomer = new Map<string, typeof orders>();
  for (const order of orders) {
    const list = ordersByCustomer.get(order.customer_id) ?? [];
    list.push(order);
    ordersByCustomer.set(order.customer_id, list);
  }
  const stageCounts: Record<LifecycleStage, number> = {
    lead: 0,
    new: 0,
    active: 0,
    at_risk: 0,
    churned: 0,
    won_back: 0,
  };
  for (const customer of customers) {
    const stage = computeLifecycleStage(ordersByCustomer.get(customer.id) ?? []);
    stageCounts[stage]++;
  }
  const stageLabels: Record<LifecycleStage, string> = {
    lead: o.stageLead,
    new: o.stageNew,
    active: o.stageActive,
    at_risk: o.stageAtRisk,
    churned: o.stageChurned,
    won_back: o.stageWonBack,
  };
  const lifecycleSegments: LifecycleSegment[] = (Object.keys(LIFECYCLE_STYLE) as LifecycleStage[]).map((stage) => ({
    key: stage,
    label: stageLabels[stage],
    count: stageCounts[stage],
    barClass: LIFECYCLE_STYLE[stage].bar,
    chipClass: LIFECYCLE_STYLE[stage].chip,
    icon: LIFECYCLE_STYLE[stage].icon,
  }));
  const clvSummary = summarizeClv(customers, ordersByCustomer);

  // Nudge card: point at whichever high-value setup step isn't done yet.
  const nudge =
    connectedChannelCount === 0
      ? { title: o.nudgeConnectTitle, body: o.nudgeConnectBody, href: "/dashboard/settings/channels", cta: o.nudgeConnectCta }
      : tiers.length === 0
        ? { title: o.nudgeLoyaltyTitle, body: o.nudgeLoyaltyBody, href: "/dashboard/loyalty", cta: o.nudgeLoyaltyCta }
        : activeAgents.length === 0
          ? { title: o.nudgeAgentTitle, body: o.nudgeAgentBody, href: "/dashboard/agents", cta: o.nudgeAgentCta }
          : { title: o.nudgeDoneTitle, body: o.nudgeDoneBody, href: "/dashboard/playground", cta: o.nudgeDoneCta };

  // Recent activity: new orders + new customers, merged chronologically.
  const activity = [
    ...orders.slice(0, 6).map((order) => ({
      key: `order-${order.id}`,
      created_at: order.created_at,
      label: `${order.status === "paid" ? o.orderPaid : order.status === "cancelled" ? o.orderCancelled : o.newOrder} — ${formatCurrency(Number(order.total_amount))}`,
      icon: order.status === "paid" ? CheckCircle2 : order.status === "cancelled" ? XCircle : ShoppingCart,
    })),
    ...customers.slice(0, 6).map((c) => ({
      key: `customer-${c.id}`,
      created_at: c.created_at,
      label: `${o.newCustomer} — ${c.display_name ?? o.unnamed}`,
      icon: UserPlus,
    })),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  return (
    // pb-8 (not just relying on <main>'s own py-8): the h-full/flex-1/min-h-0
    // chain in app/layout.tsx + dashboard/layout.tsx (needed so pages like
    // Inbox can size internal split-pane scroll regions) excludes a scroll
    // ancestor's own bottom padding once a descendant like this page
    // overflows it — verified empirically, not just in dev tools. Padding
    // has to live on the actual overflowing content instead.
    <div className="space-y-5 pb-8">
      <p className="text-sm text-zinc-500">
        {format(o.watchingLine, {
          channels: connectedChannelCount,
          channelsPlural: connectedChannelCount === 1 ? "" : "s",
          conversations: openConversations,
          conversationsPlural: openConversations === 1 ? "" : "s",
        })}
      </p>

      <Card padding="sm">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="flex flex-col items-center gap-2 rounded-xl px-2 py-3 text-center hover:bg-zinc-50"
              >
                <span className="w-11 h-11 rounded-full border border-zinc-200 flex items-center justify-center text-zinc-600">
                  <Icon size={18} strokeWidth={2} />
                </span>
                <span className="text-xs font-medium text-zinc-600 truncate w-full">{t.nav[action.key]}</span>
              </Link>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-5">
            <Link
              href="/dashboard/orders"
              className="sm:col-span-2 rounded-2xl bg-gradient-to-br from-violet-50 to-white border border-violet-100 text-zinc-900 p-5 relative overflow-hidden flex flex-col justify-between min-h-[180px]"
            >
              <div className="absolute -right-6 -top-10 w-40 h-40 rounded-full bg-violet-200/30 blur-2xl" />
              <div className="relative">
                <div className="text-sm text-zinc-500 truncate">{tenant.business_name}</div>
                <div className="text-2xl font-semibold mt-2">{formatCurrency(totalRevenue)}</div>
                <div className="text-xs text-violet-600 font-medium mt-1">
                  {revenueDelta >= 0 ? "+" : ""}
                  {revenueDelta}% {o.thisWeek}
                </div>
              </div>
              <div className="relative text-xs text-zinc-500">
                {activeAgents.length === 0 ? o.usingDefault : format(o.specializedActive, { count: activeAgents.length })}
              </div>
            </Link>

            <div className="sm:col-span-3">
              <h2 className="font-medium text-sm mb-3">{o.recentActivity}</h2>
              {activity.length === 0 ? (
                <p className="text-sm text-zinc-500">{o.nothingYet}</p>
              ) : (
                <ul className="space-y-3">
                  {activity.map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.key} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
                          <Icon size={14} className="text-zinc-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm truncate">{item.label}</p>
                        </div>
                        <p className="text-xs text-zinc-500 shrink-0">{formatDate(item.created_at, locale)}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </Card>

        <Card className="flex flex-col items-center text-center">
          <DonutRing percent={fulfillmentRate} value={`${paidOrders.length}/${orders.length}`} label={o.ordersPaid} />
          <p className="text-xs text-zinc-500 mt-2 mb-4">
            {pendingOrders} {o.ordersPending}
          </p>
          <div className="w-full text-left">
            <h3 className="text-xs font-medium text-zinc-500 mb-3">{o.channels}</h3>
            {channelSegments.length === 0 ? (
              <p className="text-sm text-zinc-500">{o.nothingYet}</p>
            ) : (
              <ChannelBreakdown segments={channelSegments} />
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <h2 className="font-medium mb-3 text-sm text-zinc-500">{format(o.ordersLastDays, { days: TREND_DAYS })}</h2>
          <OrdersTrendChart data={trendData} />
        </Card>
        <Card>
          <h2 className="font-medium mb-3 text-sm text-zinc-500">{format(o.ordersLastDays, { days: REVENUE_DAYS })}</h2>
          <RevenueByDayBar data={revenueByDay} />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <FunnelLifecycleToggle
            atRiskCount={stageCounts.at_risk}
            t={{
              funnelTitle: o.funnelTitle,
              funnelSubtitle: o.funnelSubtitle,
              lifecycleTitle: o.lifecycleTitle,
              lifecycleSubtitle: o.lifecycleSubtitle,
              lifecycleAtRiskCallout: o.lifecycleAtRiskCallout,
            }}
            funnelView={
              <MarketingFunnel stages={funnelStages} ofTotalLabel={o.funnelOfTotal} ofPreviousLabel={o.funnelOfPrevious} />
            }
            lifecycleView={<LifecycleBreakdown segments={lifecycleSegments} />}
          />
        </Card>

        <Card>
          <h2 className="font-medium text-sm mb-1">{o.clvTitle}</h2>
          <p className="text-xs text-zinc-500 mb-4">{o.clvSubtitle}</p>
          <div className="space-y-4">
            <div>
              <div className="text-2xl font-semibold">{formatCurrency(clvSummary.avgClv)}</div>
              <div className="text-xs text-zinc-500">{o.clvAvg}</div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-100">
              <div>
                <div className="text-lg font-semibold text-violet-600">{formatCurrency(clvSummary.avgClvMembers)}</div>
                <div className="text-xs text-zinc-500">{o.clvMembers}</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-zinc-500">{formatCurrency(clvSummary.avgClvNonMembers)}</div>
                <div className="text-xs text-zinc-500">{o.clvNonMembers}</div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <StatisticsToggle
            weekly={weekly}
            monthly={monthly}
            t={{
              statistics: o.statistics,
              weekly: o.weekly,
              monthly: o.monthly,
              newCustomers: o.newCustomers,
            }}
          />
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-sm text-zinc-500">{o.lowStock}</h2>
            <Link href="/dashboard/products" className="text-xs text-violet-600 hover:underline">
              {t.common.viewAll}
            </Link>
          </div>
          {lowStockProducts.length === 0 ? (
            <p className="text-sm text-zinc-500">{o.nothingLow}</p>
          ) : (
            <ul className="space-y-2">
              {lowStockProducts.slice(0, 4).map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <span className="truncate text-zinc-700">{p.name}</span>
                  <Badge variant={p.stock === 0 ? "destructive" : "warning"} className="shrink-0 ml-2">
                    {p.stock === 0 ? o.outOfStock : format(o.leftInStock, { count: p.stock })}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Link
          href={nudge.href}
          className="rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white p-5 flex flex-col justify-between hover:from-violet-500 hover:to-fuchsia-400 relative overflow-hidden"
        >
          <div className="absolute -right-8 -bottom-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
          <div>
            <h2 className="font-medium mb-1">{nudge.title}</h2>
            <p className="text-sm text-white/80">{nudge.body}</p>
          </div>
          <span className="inline-flex items-center gap-2 bg-white text-zinc-900 rounded-full px-4 py-2 text-sm font-medium mt-4 self-start">
            {nudge.cta}
          </span>
        </Link>
      </div>
    </div>
  );
}
