"use client";

import { useState } from "react";
import { Sparkles, Cpu, ExternalLink, type LucideIcon } from "lucide-react";
import { updateLlmSettingsAction, clearLlmApiKeyAction } from "@/app/dashboard/settings/actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface VendorOption {
  key: "qwen" | "kimi";
  name: string;
  desc: string;
  defaultModel: string;
}

const VENDOR_ICONS: Record<VendorOption["key"], LucideIcon> = {
  qwen: Sparkles,
  kimi: Cpu,
};

// Concurrency/RPM/TPM/TPD are rate limits enforced by the provider, not
// something this app tracks — each console already shows authoritative
// live usage against the real quota, straight from the source.
const VENDOR_USAGE_URLS: Record<VendorOption["key"], string> = {
  qwen: "https://modelstudio.console.alibabacloud.com/",
  kimi: "https://platform.moonshot.ai/console/account",
};

export function LlmProviderForm({
  tenantId,
  currentModel,
  hasApiKey,
  vendors,
  labels,
}: {
  tenantId: string;
  currentModel: string;
  hasApiKey: boolean;
  vendors: VendorOption[];
  labels: {
    model: string;
    apiKeySet: string;
    apiKeyNotSet: string;
    apiKeyPlaceholder: string;
    save: string;
    active: string;
    noApiKey: string;
    removeKey: string;
    removeKeyConfirm: string;
    viewUsage: string;
  };
}) {
  const initialVendor = vendors.find((v) => currentModel.toLowerCase().startsWith(v.key))?.key ?? vendors[0].key;
  const [vendor, setVendor] = useState(initialVendor);
  const [model, setModel] = useState(currentModel);

  function selectVendor(v: VendorOption) {
    setVendor(v.key);
    setModel(v.defaultModel);
  }

  return (
    <form action={updateLlmSettingsAction} className="space-y-3">
      <input type="hidden" name="tenant_id" value={tenantId} />
      <input type="hidden" name="vendor" value={vendor} />

      <div className="space-y-2">
        {vendors.map((v) => {
          const Icon = VENDOR_ICONS[v.key];
          const selected = vendor === v.key;
          const connected = selected && hasApiKey;
          const needsKey = selected && !hasApiKey;
          return (
            <button
              type="button"
              key={v.key}
              onClick={() => selectVendor(v)}
              className={`w-full flex items-center gap-3 rounded-2xl p-3 text-left transition-colors border ${
                connected
                  ? "border-violet-300 bg-violet-50/50"
                  : needsKey
                    ? "border-amber-300 bg-amber-50/50"
                    : "border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  connected ? "bg-violet-600 text-white" : needsKey ? "bg-amber-500 text-white" : "bg-zinc-200 text-zinc-500"
                }`}
              >
                <Icon size={16} strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{v.name}</div>
                <div className="text-xs text-zinc-500 truncate">{v.desc}</div>
              </div>
              {connected && (
                <Badge variant="success" className="shrink-0">
                  {labels.active}
                </Badge>
              )}
              {needsKey && (
                <Badge variant="warning" className="shrink-0">
                  {labels.noApiKey}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      <div>
        <label className="text-xs text-zinc-500">{labels.model}</label>
        <Input name="llm_model" value={model} onChange={(e) => setModel(e.target.value)} />
      </div>
      <div>
        <label className="text-xs text-zinc-500">{hasApiKey ? labels.apiKeySet : labels.apiKeyNotSet}</label>
        <Input name="llm_api_key" type="password" placeholder={labels.apiKeyPlaceholder} />
      </div>
      <a
        href={VENDOR_USAGE_URLS[vendor]}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700"
      >
        {labels.viewUsage}
        <ExternalLink size={12} strokeWidth={2} />
      </a>
      <div className="flex items-center gap-2">
        <Button type="submit">{labels.save}</Button>
        {hasApiKey && (
          <button
            type="submit"
            formAction={clearLlmApiKeyAction}
            onClick={(e) => {
              if (!window.confirm(labels.removeKeyConfirm)) e.preventDefault();
            }}
            className="text-sm text-red-600 hover:text-red-700 px-3 py-2"
          >
            {labels.removeKey}
          </button>
        )}
      </div>
    </form>
  );
}
