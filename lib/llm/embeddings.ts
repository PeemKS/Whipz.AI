import "server-only";
import { llmClientFor } from "@/lib/llm/client";

// Only Qwen/DashScope has an embeddings API among supported vendors —
// callers must gate on vendorSupportsEmbeddings() before calling this.
export async function embedText(text: string, apiKey: string): Promise<number[]> {
  const model = process.env.QWEN_EMBEDDING_MODEL ?? "text-embedding-v3";
  const res = await llmClientFor("qwen", apiKey).embeddings.create({
    model,
    input: text,
    // DashScope's text-embedding-v3 only accepts 512, 768, or 1024 —
    // 1536 (a common OpenAI-style default) is rejected with a 400. Must
    // match products.embedding / agents.specialization_embedding's
    // vector(1024) column exactly, or inserts fail.
    dimensions: 1024,
  });
  return res.data[0].embedding;
}
