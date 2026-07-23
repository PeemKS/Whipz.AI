import "server-only";
import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";

export type LlmVendor = "qwen" | "kimi";

interface VendorConfig {
  baseURL: string;
  defaultModel: string;
  // Kimi's API has no embeddings endpoint — callers must gate any
  // embedText() use on this before calling.
  supportsEmbeddings: boolean;
}

const VENDOR_CONFIG: Record<LlmVendor, VendorConfig> = {
  qwen: {
    baseURL: process.env.DASHSCOPE_BASE_URL ?? "",
    defaultModel: process.env.QWEN_MODEL ?? "qwen3.7-plus",
    supportsEmbeddings: true,
  },
  kimi: {
    baseURL: "https://api.moonshot.ai/v1",
    defaultModel: "kimi-k3",
    supportsEmbeddings: false,
  },
};

// There's no separate "vendor" column — the tenant's llm_model string is
// the single source of truth (e.g. "kimi-k3" vs "qwen3.7-plus"), matching
// the free-text model field already exposed in Settings.
export function vendorForModel(model: string | null | undefined): LlmVendor {
  return model?.toLowerCase().startsWith("kimi") ? "kimi" : "qwen";
}

// Every tenant brings their own key (no platform-hosted fallback) — a
// fresh client per call, never cached across tenants.
export function llmClientFor(vendor: LlmVendor, apiKey: string): OpenAI {
  const config = VENDOR_CONFIG[vendor];
  if (!config.baseURL) {
    throw new Error(`Missing base URL for LLM vendor "${vendor}". Copy .env.local.example to .env.local and fill it in.`);
  }
  return new OpenAI({ apiKey, baseURL: config.baseURL });
}

export function defaultModelFor(vendor: LlmVendor): string {
  return VENDOR_CONFIG[vendor].defaultModel;
}

export function vendorSupportsEmbeddings(vendor: LlmVendor): boolean {
  return VENDOR_CONFIG[vendor].supportsEmbeddings;
}

// A minimal real call to the provider — lets Settings tell the tenant
// immediately whether a key/model actually works (wrong key, unpurchased
// model, suspended billing, etc.) instead of them discovering it later in
// the Playground or in production.
export async function testLlmConnection(
  vendor: LlmVendor,
  apiKey: string,
  model: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await llmClientFor(vendor, apiKey).chat.completions.create({
      model,
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 1,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export type { ChatCompletionMessageParam, ChatCompletionTool };
