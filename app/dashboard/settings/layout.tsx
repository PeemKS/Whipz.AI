import { SettingsNav } from "@/app/dashboard/settings/SettingsNav";
import { getT } from "@/lib/i18n/getT";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const t = await getT();
  const s = t.settings;

  return (
    <div className="flex gap-8">
      <SettingsNav
        labels={{
          profile: s.tabProfile,
          business: s.tabBusiness,
          channels: s.tabChannels,
          llm: s.tabLlm,
          faqCache: s.tabFaqCache,
          account: s.tabAccount,
        }}
      />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
