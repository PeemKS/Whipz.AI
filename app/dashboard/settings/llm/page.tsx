import { Zap, Brain } from "lucide-react";
import { getCurrentTenant } from "@/lib/dashboard/currentTenant";
import { getT } from "@/lib/i18n/getT";
import { format } from "@/lib/i18n/format";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LlmProviderForm } from "@/app/dashboard/settings/llm/LlmProviderForm";
import { ClearBannerParams } from "@/app/dashboard/settings/llm/ClearBannerParams";
import { updateEscalationThresholdAction, updateTokenBudgetAction } from "@/app/dashboard/settings/actions";

const INERT_PROVIDERS = [
  { key: "openai", nameKey: "llmProviderOpenAI", descKey: "llmProviderOpenAIDesc", icon: Zap },
  { key: "anthropic", nameKey: "llmProviderAnthropic", descKey: "llmProviderAnthropicDesc", icon: Brain },
] as const;

export default async function LlmSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; ok?: string; error?: string; removed?: string }>;
}) {
  const { tenant } = await getCurrentTenant();
  if (!tenant) return null;
  const { saved, ok, error, removed } = await searchParams;
  const t = await getT();
  const s = t.settings;

  const vendors = [
    { key: "qwen" as const, name: s.llmProviderQwen, desc: s.llmProviderQwenDesc, defaultModel: "qwen3.7-plus" },
    { key: "kimi" as const, name: s.llmProviderKimi, desc: s.llmProviderKimiDesc, defaultModel: "kimi-k3" },
  ];
  const savedVendor = vendors.find((v) => v.key === saved);
  const removedVendor = vendors.find((v) => v.key === removed);

  let banner: { tone: "success" | "error"; text: string } | null = null;
  if (removedVendor) {
    banner = { tone: "error", text: format(s.llmKeyRemoved, { provider: removedVendor.name }) };
  } else if (savedVendor) {
    if (ok === "1") {
      banner = { tone: "success", text: format(s.llmTestOk, { provider: savedVendor.name }) };
    } else if (ok === "0") {
      banner = { tone: "error", text: format(s.llmTestFailed, { provider: savedVendor.name, error: error ?? "" }) };
    } else {
      banner = { tone: "success", text: format(s.llmSavedSuccess, { provider: savedVendor.name }) };
    }
  }

  return (
    <>
    <Card className="max-w-lg">
      {banner && (
        <>
          <ClearBannerParams />
          <div
            className={`rounded-2xl border p-4 text-sm mb-4 ${
              banner.tone === "success" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
            }`}
          >
            {banner.text}
          </div>
        </>
      )}
      <h2 className="font-medium mb-3 text-sm text-zinc-500">{s.llmProvidersTitle}</h2>
      <LlmProviderForm
        tenantId={tenant.id}
        currentModel={tenant.llm_model ?? "qwen3.7-plus"}
        hasApiKey={!!tenant.llm_api_key_enc}
        vendors={vendors}
        labels={{
          model: s.model,
          apiKeySet: s.apiKeySet,
          apiKeyNotSet: s.apiKeyNotSet,
          apiKeyPlaceholder: s.apiKeyPlaceholder,
          save: t.common.save,
          active: t.common.active,
          noApiKey: s.llmNoApiKey,
          removeKey: s.llmRemoveKey,
          removeKeyConfirm: s.llmRemoveKeyConfirm,
          viewUsage: s.llmViewUsage,
        }}
      />

      <ul className="space-y-2 mt-2">
        {INERT_PROVIDERS.map((p) => {
          const Icon = p.icon;
          return (
            <li key={p.key} className="flex items-center gap-3 rounded-2xl p-3 opacity-60">
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-zinc-200 text-zinc-500">
                <Icon size={16} strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{s[p.nameKey]}</div>
                <div className="text-xs text-zinc-500 truncate">{s[p.descKey]}</div>
              </div>
              <Badge variant="neutral" className="shrink-0">
                {s.comingSoon}
              </Badge>
            </li>
          );
        })}
      </ul>
    </Card>

    <Card className="max-w-lg mt-6">
      <h2 className="font-medium mb-1">{s.escalationTitle}</h2>
      <p className="text-sm text-zinc-500 mb-4">{s.escalationDesc}</p>
      <form action={updateEscalationThresholdAction} className="flex items-end gap-2">
        <input type="hidden" name="tenant_id" value={tenant.id} />
        <div className="flex-1">
          <label className="text-xs text-zinc-500">{s.escalationThresholdLabel}</label>
          <Input name="v3_threshold_amount" type="number" min="0" step="1" defaultValue={tenant.v3_threshold_amount} />
        </div>
        <Button type="submit" variant="secondary">
          {s.escalationSave}
        </Button>
      </form>
    </Card>

    <Card className="max-w-lg mt-6">
      <h2 className="font-medium mb-1">{s.tokenBudgetTitle}</h2>
      <p className="text-sm text-zinc-500 mb-4">{s.tokenBudgetDesc}</p>
      <form action={updateTokenBudgetAction} className="flex items-end gap-2">
        <input type="hidden" name="tenant_id" value={tenant.id} />
        <div className="flex-1">
          <label className="text-xs text-zinc-500">{s.tokenBudgetLabel}</label>
          <Input
            name="monthly_token_budget"
            type="number"
            min="0"
            step="1000"
            placeholder={s.tokenBudgetPlaceholder}
            defaultValue={tenant.monthly_token_budget ?? ""}
          />
        </div>
        <Button type="submit" variant="secondary">
          {s.tokenBudgetSave}
        </Button>
      </form>
    </Card>
    </>
  );
}
