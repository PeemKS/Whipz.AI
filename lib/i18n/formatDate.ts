import type { Locale } from "@/lib/i18n/config";

const BE_OFFSET = 543;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatDate(input: string | Date, locale: Locale): string {
  const date = typeof input === "string" ? new Date(input) : input;
  if (locale === "th") {
    return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear() + BE_OFFSET}`;
  }
  return date.toLocaleDateString();
}

export function formatDateTime(input: string | Date, locale: Locale): string {
  const date = typeof input === "string" ? new Date(input) : input;
  if (locale === "th") {
    return `${formatDate(date, locale)} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  }
  return date.toLocaleString();
}
