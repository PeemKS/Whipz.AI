"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerAuth } from "@/lib/supabase/serverAuth";
import { createAgent, updateAgent, deleteAgent, updateAgentEmbedding } from "@/lib/db/agents";
import { getTenant } from "@/lib/db/tenants";
import { embedText } from "@/lib/llm/embeddings";
import { vendorForModel, vendorSupportsEmbeddings } from "@/lib/llm/client";
import { decryptSecret } from "@/lib/crypto/tenantKey";

export async function createAgentAction(formData: FormData) {
  const tenant_id = String(formData.get("tenant_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const specialization = String(formData.get("specialization") ?? "").trim();
  const system_prompt = String(formData.get("system_prompt") ?? "").trim();
  if (!tenant_id || !name || !specialization || !system_prompt) return;

  const db = await supabaseServerAuth();
  const agent = await createAgent(db, { tenant_id, name, specialization, system_prompt });

  // Embedding needs an LLM key on a vendor that supports embeddings —
  // skip it (not a hard failure) otherwise, or if the call itself fails
  // (key restrictions, unactivated model, etc.); the agent just falls
  // back to the LLM router on every turn until it's embedded (see
  // routeAgent).
  const tenant = await getTenant(db, tenant_id);
  if (tenant?.llm_api_key_enc && vendorSupportsEmbeddings(vendorForModel(tenant.llm_model))) {
    try {
      const embedding = await embedText(specialization, decryptSecret(tenant.llm_api_key_enc));
      await updateAgentEmbedding(db, agent.id, embedding);
    } catch (err) {
      console.error(`Failed to embed agent ${agent.id}:`, err);
    }
  }

  revalidatePath("/dashboard/agents");
}

export async function toggleAgentActiveAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const is_active = formData.get("is_active") === "true";
  if (!id) return;
  const db = await supabaseServerAuth();
  await updateAgent(db, id, { is_active: !is_active });
  revalidatePath("/dashboard/agents");
}

export async function deleteAgentAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const db = await supabaseServerAuth();
  await deleteAgent(db, id);
  revalidatePath("/dashboard/agents");
}
