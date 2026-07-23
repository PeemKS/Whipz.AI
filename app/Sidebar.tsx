"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Inbox,
  Bot,
  Package,
  Tag,
  Users,
  ShoppingCart,
  Gift,
  FlaskConical,
  Settings,
  Layers,
  Receipt,
  Activity,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { setBrowserCookie } from "@/lib/browserCookie";
import { LogoMark } from "@/components/ui/LogoMark";
import { signOutAction } from "@/lib/dashboard/actions";

export interface SidebarLabels {
  overview: string;
  inbox: string;
  agents: string;
  products: string;
  promotions: string;
  customers: string;
  orders: string;
  loyalty: string;
  playground: string;
  settings: string;
  catalog: string;
  sales: string;
  aiPerformance: string;
}

type NavLeaf = { href: string; key: keyof SidebarLabels; icon: LucideIcon };
type NavEntry = ({ type: "item" } & NavLeaf) | { type: "group"; key: keyof SidebarLabels; icon: LucideIcon; items: NavLeaf[] };

const NAV_ENTRIES: NavEntry[] = [
  { type: "item", href: "/dashboard", key: "overview", icon: LayoutDashboard },
  { type: "item", href: "/dashboard/inbox", key: "inbox", icon: Inbox },
  { type: "item", href: "/dashboard/agents", key: "agents", icon: Bot },
  {
    type: "group",
    key: "catalog",
    icon: Layers,
    items: [
      { href: "/dashboard/products", key: "products", icon: Package },
      { href: "/dashboard/promotions", key: "promotions", icon: Tag },
    ],
  },
  {
    type: "group",
    key: "sales",
    icon: Receipt,
    items: [
      { href: "/dashboard/customers", key: "customers", icon: Users },
      { href: "/dashboard/orders", key: "orders", icon: ShoppingCart },
      { href: "/dashboard/loyalty", key: "loyalty", icon: Gift },
    ],
  },
  { type: "item", href: "/dashboard/playground", key: "playground", icon: FlaskConical },
  { type: "item", href: "/dashboard/ai-performance", key: "aiPerformance", icon: Activity },
  { type: "item", href: "/dashboard/settings", key: "settings", icon: Settings },
];

// Flat icon list for the collapsed rail — group headers don't link
// anywhere, so only their children make sense as standalone icons there.
const FLAT_NAV_ITEMS: NavLeaf[] = NAV_ENTRIES.flatMap((entry) => (entry.type === "item" ? [entry] : entry.items));

const COLLAPSE_COOKIE = "sidebar_collapsed";

export interface SidebarTenant {
  business_name: string;
  logo_url: string | null;
}

function BrandMark({ tenant, size }: { tenant: SidebarTenant; size: number }) {
  return tenant.logo_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={tenant.logo_url}
      alt={tenant.business_name}
      className="rounded-full object-cover border border-zinc-200 shrink-0"
      style={{ width: size, height: size }}
    />
  ) : (
    <div
      className="rounded-full bg-zinc-900 text-white flex items-center justify-center font-medium shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {tenant.business_name.charAt(0).toUpperCase()}
    </div>
  );
}

export function Sidebar({
  labels,
  initialCollapsed,
  tenant,
  signOutLabel,
}: {
  labels: SidebarLabels;
  initialCollapsed: boolean;
  tenant: SidebarTenant | null;
  signOutLabel: string;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  if (pathname === "/login" || pathname === "/signup") return null;

  function setCollapsedPersisted(next: boolean) {
    setCollapsed(next);
    setBrowserCookie(COLLAPSE_COOKIE, String(next));
  }

  function isActive(href: string) {
    return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
  }

  function isGroupOpen(entry: Extract<NavEntry, { type: "group" }>) {
    const hasActiveChild = entry.items.some((item) => isActive(item.href));
    return openGroups[entry.key] ?? hasActiveChild ?? true;
  }

  // Collapsed: compact icon-only rail. Same aside/link padding as the
  // expanded rail below so icons sit at the same x-position in both
  // states — only the labels appear/disappear, nothing shifts sideways.
  if (collapsed) {
    return (
      <aside className="w-20 shrink-0 h-full bg-[var(--app-bg)] flex flex-col py-4 px-3">
        <div className="px-2 mb-4 shrink-0">
          {tenant ? (
            <Link href="/dashboard/settings" className="block w-fit">
              <BrandMark tenant={tenant} size={36} />
            </Link>
          ) : (
            <LogoMark size="md" />
          )}
        </div>

        <nav className="flex-1 flex flex-col gap-0.5 overflow-y-auto">
          {FLAT_NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-3 py-2.5 rounded-lg transition-colors ${
                  active ? "bg-zinc-100 text-zinc-900" : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                }`}
              >
                <Icon size={22} strokeWidth={2} className="shrink-0" />
              </Link>
            );
          })}
        </nav>

        <button
          onClick={() => setCollapsedPersisted(false)}
          aria-label="Show sidebar labels"
          className="flex items-center px-3 py-2.5 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
        >
          <PanelLeftOpen size={22} strokeWidth={2} />
        </button>

        <form action={signOutAction} className="pt-3 mt-2 border-t border-zinc-100 shrink-0">
          <button type="submit" className="w-full flex items-center px-3 py-2.5 rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-600">
            <LogOut size={22} strokeWidth={2} />
          </button>
        </form>
      </aside>
    );
  }

  // Default: wide labeled rail, flush against the left edge.
  return (
    <aside className="w-64 shrink-0 h-full bg-[var(--app-bg)] flex flex-col py-4 px-3">
      <div className="flex items-center justify-between gap-2.5 px-2 mb-6 shrink-0">
        {tenant ? (
          <Link href="/dashboard/settings" className="flex items-center gap-2.5 min-w-0 hover:opacity-80">
            <BrandMark tenant={tenant} size={36} />
            <span className="font-semibold text-zinc-900 truncate">{tenant.business_name}</span>
          </Link>
        ) : (
          <div className="flex items-center gap-2.5 min-w-0">
            <LogoMark size="md" />
            <span className="font-semibold text-zinc-900 truncate">Whipz AI</span>
          </div>
        )}
        <button
          onClick={() => setCollapsedPersisted(true)}
          aria-label="Collapse sidebar"
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
        >
          <PanelLeftClose size={17} strokeWidth={2} />
        </button>
      </div>

      <nav className="flex-1 flex flex-col gap-0.5 overflow-y-auto">
        {NAV_ENTRIES.map((entry) => {
          if (entry.type === "item") {
            const active = isActive(entry.href);
            const Icon = entry.icon;
            return (
              <Link
                key={entry.href}
                href={entry.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-base transition-colors ${
                  active ? "bg-zinc-100 text-zinc-900 font-semibold" : "text-zinc-600 font-medium hover:bg-zinc-100"
                }`}
              >
                <Icon size={22} strokeWidth={2} className="shrink-0" />
                <span className="truncate">{labels[entry.key]}</span>
              </Link>
            );
          }

          const open = isGroupOpen(entry);
          const GroupIcon = entry.icon;
          return (
            <div key={entry.key}>
              <button
                type="button"
                onClick={() => setOpenGroups((prev) => ({ ...prev, [entry.key]: !open }))}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-base font-medium text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                <GroupIcon size={22} strokeWidth={2} className="shrink-0" />
                <span className="flex-1 text-left truncate">{labels[entry.key]}</span>
                <ChevronDown size={16} strokeWidth={2} className={`shrink-0 transition-transform ${open ? "" : "-rotate-90"}`} />
              </button>

              {open && (
                <div className="ml-[25px] pl-3 border-l border-zinc-200 flex flex-col gap-0.5 my-0.5">
                  {entry.items.map((item) => {
                    const active = isActive(item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                          active ? "bg-zinc-100 text-zinc-900 font-semibold" : "text-zinc-600 font-medium hover:bg-zinc-100"
                        }`}
                      >
                        <Icon size={18} strokeWidth={2} className="shrink-0" />
                        <span className="truncate">{labels[item.key]}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <form action={signOutAction} className="pt-3 mt-2 border-t border-zinc-100 shrink-0">
        <button
          type="submit"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-base font-medium text-zinc-600 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut size={22} strokeWidth={2} className="shrink-0" />
          <span className="truncate">{signOutLabel}</span>
        </button>
      </form>
    </aside>
  );
}
