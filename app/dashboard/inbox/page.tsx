import { getT } from "@/lib/i18n/getT";

export default async function InboxIndexPage() {
  const t = await getT();
  return (
    <div className="h-full flex items-center justify-center text-sm text-zinc-500 p-4 text-center">
      {t.inbox.selectConversation}
    </div>
  );
}
