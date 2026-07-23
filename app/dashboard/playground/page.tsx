import Link from "next/link";
import { getCurrentTenant } from "@/lib/dashboard/currentTenant";
import { PlaygroundChat } from "@/app/dashboard/playground/PlaygroundChat";
import { getT } from "@/lib/i18n/getT";
import { vendorForModel } from "@/lib/llm/client";

export default async function PlaygroundPage() {
  const { tenant } = await getCurrentTenant();
  if (!tenant) return null;
  const t = await getT();

  if (!tenant.llm_model) {
    return (
      <p className="text-sm text-zinc-500">
        {t.playground.noLlmConfigured}{" "}
        <Link href="/dashboard/settings" className="underline">
          {t.overview.setupInSettings}
        </Link>{" "}
        {t.playground.setupFirst}
      </p>
    );
  }

  const vendor = vendorForModel(tenant.llm_model);
  const providerName = vendor === "kimi" ? t.settings.llmProviderKimi : t.settings.llmProviderQwen;

  return (
    <PlaygroundChat
      tenantId={tenant.id}
      t={t.playground}
      modelLabel={t.settings.model}
      model={tenant.llm_model}
      providerName={providerName}
    />
  );
}
