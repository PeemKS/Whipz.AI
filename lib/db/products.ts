import type { SupabaseClient } from "@supabase/supabase-js";
import type { Product } from "@/lib/supabase/types";

export async function listProducts(db: SupabaseClient, tenant_id: string): Promise<Product[]> {
  const { data, error } = await db
    .from("products")
    .select("*")
    .eq("tenant_id", tenant_id)
    .order("name", { ascending: true });
  if (error) throw error;
  return data as Product[];
}

export async function getProduct(db: SupabaseClient, id: string): Promise<Product | null> {
  const { data, error } = await db.from("products").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Product | null;
}

export async function getProductBySku(db: SupabaseClient, tenant_id: string, sku: string): Promise<Product | null> {
  const { data, error } = await db
    .from("products")
    .select("*")
    .eq("tenant_id", tenant_id)
    .eq("sku", sku)
    .maybeSingle();
  if (error) throw error;
  return data as Product | null;
}

export async function createProduct(
  db: SupabaseClient,
  input: {
    tenant_id: string;
    sku: string;
    name: string;
    price: number;
    stock: number;
    category?: string;
    description?: string;
  }
): Promise<Product> {
  const { data, error } = await db.from("products").insert(input).select("*").single();
  if (error) throw error;
  return data as Product;
}

export async function updateProduct(
  db: SupabaseClient,
  id: string,
  input: Partial<Pick<Product, "sku" | "name" | "price" | "stock" | "category" | "description">>
): Promise<Product> {
  const { data, error } = await db
    .from("products")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Product;
}

export async function updateProductStock(db: SupabaseClient, id: string, stock: number): Promise<Product> {
  const { data, error } = await db
    .from("products")
    .update({ stock, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Product;
}

export async function updateProductEmbedding(db: SupabaseClient, id: string, embedding: number[]): Promise<void> {
  const { error } = await db.from("products").update({ embedding }).eq("id", id);
  if (error) throw error;
}

export async function deleteProduct(db: SupabaseClient, id: string): Promise<void> {
  const { error } = await db.from("products").delete().eq("id", id);
  if (error) throw error;
}

// Atomically decrements stock, refusing to go negative. Returns the
// updated product, or null if there wasn't enough stock.
export async function decrementStock(
  db: SupabaseClient,
  tenant_id: string,
  sku: string,
  qty: number
): Promise<Product | null> {
  const product = await getProductBySku(db, tenant_id, sku);
  if (!product || product.stock < qty) return null;

  const { data, error } = await db
    .from("products")
    .update({ stock: product.stock - qty, updated_at: new Date().toISOString() })
    .eq("id", product.id)
    .eq("stock", product.stock) // optimistic concurrency check
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return (data as Product | null) ?? null;
}

const PRODUCT_IMAGES_BUCKET = "product-images";

// Uploads to the {tenant_id}/{product_id}/{filename} path the storage
// RLS policies expect, then appends the resulting public URL to the
// product's `images` array.
export async function uploadProductImage(
  db: SupabaseClient,
  tenant_id: string,
  product_id: string,
  file: File
): Promise<Product> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${tenant_id}/${product_id}/${Date.now()}.${ext}`;

  const { error: uploadError } = await db.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(path, file, { contentType: file.type || "image/jpeg" });
  if (uploadError) throw uploadError;

  const { data: publicUrlData } = db.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path);

  const product = await getProduct(db, product_id);
  if (!product) throw new Error(`Product ${product_id} not found`);

  const images = [...(product.images ?? []), publicUrlData.publicUrl];
  const { data, error } = await db
    .from("products")
    .update({ images, updated_at: new Date().toISOString() })
    .eq("id", product_id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Product;
}

export async function removeProductImage(db: SupabaseClient, product_id: string, url: string): Promise<Product> {
  const product = await getProduct(db, product_id);
  if (!product) throw new Error(`Product ${product_id} not found`);

  const images = (product.images as string[]).filter((img) => img !== url);
  const { data, error } = await db
    .from("products")
    .update({ images, updated_at: new Date().toISOString() })
    .eq("id", product_id)
    .select("*")
    .single();
  if (error) throw error;

  // Best-effort: also remove the underlying storage object.
  const path = url.split(`/${PRODUCT_IMAGES_BUCKET}/`)[1];
  if (path) await db.storage.from(PRODUCT_IMAGES_BUCKET).remove([path]);

  return data as Product;
}

export async function searchProducts(
  db: SupabaseClient,
  tenant_id: string,
  queryEmbedding: number[],
  limit = 4
): Promise<
  {
    id: string;
    sku: string;
    name: string;
    price: number;
    stock: number;
    description: string | null;
    document_text: string | null;
    similarity: number;
  }[]
> {
  const { data, error } = await db.rpc("match_products", {
    p_tenant_id: tenant_id,
    p_query_embedding: queryEmbedding,
    p_match_count: limit,
  });
  if (error) throw error;
  return data;
}

const PRODUCT_DOCUMENTS_BUCKET = "product-documents";

// Uploads the source file (kept for reference/re-processing) and saves
// the already-extracted text alongside it — callers extract via
// lib/products/extractDocumentText.ts before calling this, since parsing
// (e.g. PDF) doesn't belong in the data-access layer.
export async function uploadProductDocument(
  db: SupabaseClient,
  tenant_id: string,
  product_id: string,
  file: File,
  documentText: string
): Promise<Product> {
  const path = `${tenant_id}/${product_id}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await db.storage
    .from(PRODUCT_DOCUMENTS_BUCKET)
    .upload(path, file, { contentType: file.type || "application/octet-stream" });
  if (uploadError) throw uploadError;

  const { data, error } = await db
    .from("products")
    .update({
      document_name: file.name,
      document_path: path,
      document_text: documentText,
      updated_at: new Date().toISOString(),
    })
    .eq("id", product_id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Product;
}

export async function removeProductDocument(db: SupabaseClient, product_id: string): Promise<Product> {
  const product = await getProduct(db, product_id);
  if (!product) throw new Error(`Product ${product_id} not found`);

  const { data, error } = await db
    .from("products")
    .update({ document_name: null, document_path: null, document_text: null, updated_at: new Date().toISOString() })
    .eq("id", product_id)
    .select("*")
    .single();
  if (error) throw error;

  if (product.document_path) await db.storage.from(PRODUCT_DOCUMENTS_BUCKET).remove([product.document_path]);

  return data as Product;
}
