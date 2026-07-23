"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerAuth } from "@/lib/supabase/serverAuth";
import { createFaqCache, updateFaqCacheEmbedding, setFaqCacheActive, deleteFaqCache } from "@/lib/db/faqCache";
import { getTenant } from "@/lib/db/tenants";
import { embedText } from "@/lib/llm/embeddings";
import { vendorForModel, vendorSupportsEmbeddings } from "@/lib/llm/client";
import { decryptSecret } from "@/lib/crypto/tenantKey";

export async function createFaqCacheAction(formData: FormData) {
  const tenant_id = String(formData.get("tenant_id") ?? "");
  const question = String(formData.get("question") ?? "").trim();
  const answer = String(formData.get("answer") ?? "").trim();
  if (!tenant_id || !question || !answer) return;

  const db = await supabaseServerAuth();
  const entry = await createFaqCache(db, { tenant_id, question, answer });

  // Same graceful-degradation pattern as agent specialization embeddings
  // (app/dashboard/agents/actions.ts) — without an embedding this entry
  // just never matches in matchFaqCache until re-saved with a key set.
  const tenant = await getTenant(db, tenant_id);
  if (tenant?.llm_api_key_enc && vendorSupportsEmbeddings(vendorForModel(tenant.llm_model))) {
    try {
      const embedding = await embedText(question, decryptSecret(tenant.llm_api_key_enc));
      await updateFaqCacheEmbedding(db, entry.id, embedding);
    } catch (err) {
      console.error(`Failed to embed FAQ cache entry ${entry.id}:`, err);
    }
  }

  revalidatePath("/dashboard/settings/faq-cache");
}

export async function toggleFaqCacheActiveAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  if (!id) return;
  const db = await supabaseServerAuth();
  await setFaqCacheActive(db, id, !active);
  revalidatePath("/dashboard/settings/faq-cache");
}

export async function deleteFaqCacheAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const db = await supabaseServerAuth();
  await deleteFaqCache(db, id);
  revalidatePath("/dashboard/settings/faq-cache");
}
