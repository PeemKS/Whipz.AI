"use client";

import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { LanguageSwitcher } from "@/app/dashboard/LanguageSwitcher";
import { initialFromEmail } from "@/lib/format/userName";
import type { Locale } from "@/lib/i18n/config";

export function TopBar({
  locale,
  displayName,
  email,
  avatarUrl,
  searchPlaceholder,
}: {
  locale: Locale;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  searchPlaceholder: string;
}) {
  const pathname = usePathname();
  if (pathname === "/login" || pathname === "/signup") return null;

  const initial = displayName ? displayName.charAt(0).toUpperCase() : initialFromEmail(email);

  return (
    <header className="h-16 shrink-0 bg-[var(--app-bg)] flex items-center gap-4 px-4 sm:px-6 z-50">
      <label className="w-full max-w-md flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-sm text-zinc-400 focus-within:border-violet-300 focus-within:ring-2 focus-within:ring-violet-100">
        <Search size={16} strokeWidth={2} className="shrink-0" />
        <input
          type="search"
          placeholder={searchPlaceholder}
          className="w-full bg-transparent outline-none placeholder:text-zinc-400 text-zinc-700"
        />
        <kbd className="hidden sm:inline text-[10px] font-medium text-zinc-400 border border-zinc-200 rounded px-1.5 py-0.5 shrink-0">
          ⌘K
        </kbd>
      </label>

      <div className="flex-1" />

      <div className="flex items-center gap-3 shrink-0">
        <LanguageSwitcher locale={locale} />
        <div className="flex items-center gap-2.5">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={displayName} className="w-8 h-8 rounded-full object-cover border border-zinc-200 shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white flex items-center justify-center text-xs font-medium shrink-0">
              {initial}
            </div>
          )}
          <span className="text-sm text-zinc-700 hidden md:inline">{displayName || email}</span>
        </div>
      </div>
    </header>
  );
}
