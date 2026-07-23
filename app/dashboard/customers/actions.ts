"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerAuth } from "@/lib/supabase/serverAuth";
import { getCustomer, updateCustomer } from "@/lib/db/customers";
import { getTenant } from "@/lib/db/tenants";
import { listConversationsForCustomer } from "@/lib/db/conversations";
import { listMessages } from "@/lib/db/messages";
import { llmClientFor, vendorForModel, defaultModelFor } from "@/lib/llm/client";
import { decryptSecret } from "@/lib/crypto/tenantKey";

export async function updateContactInfoAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const display_name = String(formData.get("display_name") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const birth_date = String(formData.get("birth_date") ?? "").trim() || null;
  const shipping_address = String(formData.get("shipping_address") ?? "").trim() || null;
  const marketing_consent = formData.get("marketing_consent") === "on";

  const db = await supabaseServerAuth();
  await updateCustomer(db, id, { display_name, email, phone, birth_date, shipping_address, marketing_consent });
  revalidatePath(`/dashboard/customers/${id}`);
}

export async function updateNotesAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const notes = String(formData.get("notes") ?? "");
  if (!id) return;
  const db = await supabaseServerAuth();
  await updateCustomer(db, id, { notes });
  revalidatePath(`/dashboard/customers/${id}`);
}

export async function regenerateSummaryAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const db = await supabaseServerAuth();
  const customer = await getCustomer(db, id);
  if (!customer) return;

  const tenant = await getTenant(db, customer.tenant_id);
  if (!tenant?.llm_api_key_enc) return;

  const conversations = await listConversationsForCustomer(db, id);
  const allMessages = (
    await Promise.all(conversations.map((c) => listMessages(db, c.id, 30)))
  ).flat();
  const transcript = allMessages.map((m) => `${m.sender}: ${m.content}`).join("\n");
  if (!transcript.trim()) return;

  const vendor = vendorForModel(tenant.llm_model);
  const completion = await llmClientFor(vendor, decryptSecret(tenant.llm_api_key_enc)).chat.completions.create({
    model: tenant.llm_model ?? defaultModelFor(vendor),
    messages: [
      {
        role: "system",
        content:
          "Summarize this customer's conversation history in 2-3 sentences for a CRM profile: their interests, concerns, and any notable preferences. Be concise.",
      },
      { role: "user", content: transcript },
    ],
  });

  const summary = completion.choices[0]?.message?.content;
  if (summary) {
    await updateCustomer(db, id, { notes: summary });
  }
  revalidatePath(`/dashboard/customers/${id}`);
}
