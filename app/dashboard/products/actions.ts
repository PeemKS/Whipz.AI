"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerAuth } from "@/lib/supabase/serverAuth";
import {
  createProduct,
  updateProduct,
  updateProductStock,
  updateProductEmbedding,
  deleteProduct,
  uploadProductImage,
  removeProductImage,
  uploadProductDocument,
  removeProductDocument,
} from "@/lib/db/products";
import { getTenant } from "@/lib/db/tenants";
import { embedText } from "@/lib/llm/embeddings";
import { vendorForModel, vendorSupportsEmbeddings } from "@/lib/llm/client";
import { decryptSecret } from "@/lib/crypto/tenantKey";
import { extractDocumentText } from "@/lib/products/extractDocumentText";

// DashScope's embedding input has a length limit — the full document
// text (up to 20k chars, see extractDocumentText.ts) is what gets shown
// to the LLM in the system prompt, but only an excerpt goes into the
// embedding call itself.
const EMBED_DOCUMENT_EXCERPT = 2000;

function embedInputFor(name: string, description: string | undefined, documentText: string | null | undefined): string {
  const docExcerpt = documentText ? documentText.slice(0, EMBED_DOCUMENT_EXCERPT) : "";
  return `${name}. ${description ?? ""}. ${docExcerpt}`.trim();
}

async function embedProduct(
  db: Awaited<ReturnType<typeof supabaseServerAuth>>,
  tenant_id: string,
  product_id: string,
  name: string,
  description: string | undefined,
  documentText: string | null | undefined
) {
  const tenant = await getTenant(db, tenant_id);
  if (!tenant?.llm_api_key_enc || !vendorSupportsEmbeddings(vendorForModel(tenant.llm_model))) return;
  try {
    const embedding = await embedText(embedInputFor(name, description, documentText), decryptSecret(tenant.llm_api_key_enc));
    await updateProductEmbedding(db, product_id, embedding);
  } catch (err) {
    console.error(`Failed to embed product ${product_id}:`, err);
  }
}

export async function createProductAction(formData: FormData) {
  const tenant_id = String(formData.get("tenant_id") ?? "");
  const sku = String(formData.get("sku") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const stock = Number(formData.get("stock") ?? 0);
  const price = Number(formData.get("price") ?? 0);
  const description = String(formData.get("description") ?? "").trim() || undefined;
  if (!tenant_id || !sku || !name) return;

  const db = await supabaseServerAuth();
  const product = await createProduct(db, { tenant_id, sku, name, price, stock, description });

  let documentText: string | null = null;
  const document = formData.get("document");
  if (document instanceof File && document.size > 0) {
    try {
      documentText = await extractDocumentText(document);
      await uploadProductDocument(db, tenant_id, product.id, document, documentText);
    } catch (err) {
      console.error(`Failed to process document for product ${product.id}:`, err);
    }
  }

  // Embedding needs an LLM key on a vendor that supports embeddings —
  // skip it (not a hard failure) otherwise, or if the call itself fails
  // (key restrictions, unactivated model, etc.); the product just won't
  // surface via RAG search until it's re-embedded later.
  await embedProduct(db, tenant_id, product.id, name, description, documentText);

  const image = formData.get("image");
  if (image instanceof File && image.size > 0) {
    await uploadProductImage(db, tenant_id, product.id, image);
  }

  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard");
}

export async function updateStockAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const stock = Number(formData.get("stock") ?? 0);
  if (!id) return;
  const db = await supabaseServerAuth();
  await updateProductStock(db, id, stock);
  revalidatePath("/dashboard/products");
}

export async function updateProductAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const tenant_id = String(formData.get("tenant_id") ?? "");
  const sku = String(formData.get("sku") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const stock = Number(formData.get("stock") ?? 0);
  const price = Number(formData.get("price") ?? 0);
  const category = String(formData.get("category") ?? "").trim() || undefined;
  const description = String(formData.get("description") ?? "").trim() || undefined;
  if (!id || !tenant_id || !sku || !name) return;

  const db = await supabaseServerAuth();
  const updated = await updateProduct(db, id, { sku, name, price, stock, category, description });

  let documentText = updated.document_text;
  const document = formData.get("document");
  if (document instanceof File && document.size > 0) {
    try {
      documentText = await extractDocumentText(document);
      await uploadProductDocument(db, tenant_id, id, document, documentText);
    } catch (err) {
      console.error(`Failed to process document for product ${id}:`, err);
    }
  }

  // Re-embed since the searchable text may have changed.
  await embedProduct(db, tenant_id, id, name, description, documentText);

  revalidatePath("/dashboard/products");
}

export async function removeProductDocumentAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const tenant_id = String(formData.get("tenant_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || undefined;
  if (!id) return;

  const db = await supabaseServerAuth();
  await removeProductDocument(db, id);
  if (tenant_id && name) await embedProduct(db, tenant_id, id, name, description, null);

  revalidatePath("/dashboard/products");
}

export async function addProductImageAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const tenant_id = String(formData.get("tenant_id") ?? "");
  const image = formData.get("image");
  if (!id || !tenant_id || !(image instanceof File) || image.size === 0) return;

  const db = await supabaseServerAuth();
  await uploadProductImage(db, tenant_id, id, image);
  revalidatePath("/dashboard/products");
}

export async function removeProductImageAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const url = String(formData.get("url") ?? "");
  if (!id || !url) return;
  const db = await supabaseServerAuth();
  await removeProductImage(db, id, url);
  revalidatePath("/dashboard/products");
}

export async function deleteProductAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const db = await supabaseServerAuth();
  await deleteProduct(db, id);
  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard");
}
