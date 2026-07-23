"use client";

import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";
import { setBrowserCookie } from "@/lib/browserCookie";

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const router = useRouter();

  function setLocale(next: Locale) {
    setBrowserCookie(LOCALE_COOKIE, next);
    router.refresh();
  }

  return (
    <div className="flex bg-zinc-100 rounded-full p-0.5 text-xs">
      {(["th", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          className={`px-2.5 py-1 rounded-full uppercase transition-colors ${
            locale === l ? "bg-white shadow-sm font-medium" : "text-zinc-500 hover:text-zinc-700"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
