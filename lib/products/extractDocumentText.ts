import "server-only";
import { PDFParse } from "pdf-parse";

// Keeps the extracted text within a size that's safe both as embedding
// input (DashScope has an input length limit) and as a system-prompt
// excerpt — full-document RAG-via-vector-chunking is out of scope here.
const MAX_CHARS = 20000;

export async function extractDocumentText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  let text: string;

  if (name.endsWith(".pdf")) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const parser = new PDFParse({ data: buffer });
    try {
      text = (await parser.getText()).text;
    } finally {
      await parser.destroy();
    }
  } else {
    text = await file.text();
  }

  return text.trim().slice(0, MAX_CHARS);
}
