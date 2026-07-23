"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Store, Share2, Bot, ShieldCheck, MessageCircleQuestion, type LucideIcon } from "lucide-react";

interface SettingsNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export function SettingsNav({
  labels,
}: {
  labels: { profile: string; business: string; channels: string; llm: string; faqCache: string; account: string };
}) {
  const pathname = usePathname();

  const items: SettingsNavItem[] = [
    { href: "/dashboard/settings/profile", label: labels.profile, icon: User },
    { href: "/dashboard/settings/business", label: labels.business, icon: Store },
    { href: "/dashboard/settings/channels", label: labels.channels, icon: Share2 },
    { href: "/dashboard/settings/llm", label: labels.llm, icon: Bot },
    { href: "/dashboard/settings/faq-cache", label: labels.faqCache, icon: MessageCircleQuestion },
    { href: "/dashboard/settings/account", label: labels.account, icon: ShieldCheck },
  ];

  return (
    <nav className="w-56 shrink-0 space-y-1">
      {items.map((item) => {
        const active = pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              active ? "bg-zinc-100 text-zinc-900 font-semibold" : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            <Icon size={16} strokeWidth={2} className="shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
