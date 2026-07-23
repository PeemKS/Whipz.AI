import "server-only";
import { getLocale } from "@/lib/i18n/getLocale";
import { dictionaries, type Dictionary } from "@/lib/i18n/dictionaries";

// Server-only helper — call directly at the top of any Server
// Component/Server Action. For Client Components, pass the specific
// strings down as props from their server parent instead.
export async function getT(): Promise<Dictionary> {
  const locale = await getLocale();
  return dictionaries[locale];
}
