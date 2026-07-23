import "server-only";
import { encryptSecret, decryptSecret } from "@/lib/crypto/tenantKey";
import type { Channel } from "@/lib/supabase/types";

export const PENDING_PICK_COOKIE = "pending_channel_pick";
// Short-lived — this only needs to survive the redirect to the picker
// page and the user's next click, not a real session.
export const PENDING_PICK_MAX_AGE_SECONDS = 600;

export interface PendingPick {
  tenant_id: string;
  channel: Channel;
  targets: { id: string; name: string; access_token: string }[];
}

// Page Access Tokens are real secrets, so this is encrypted (not just
// signed) using the same AES-256-GCM helper tenant BYOK keys use —
// httpOnly/Secure cookie transport isn't a substitute for that.
export function encodePendingPick(pick: PendingPick): string {
  return encryptSecret(JSON.stringify(pick));
}

export function decodePendingPick(encoded: string): PendingPick | null {
  try {
    const parsed = JSON.parse(decryptSecret(encoded));
    if (typeof parsed?.tenant_id !== "string" || typeof parsed?.channel !== "string" || !Array.isArray(parsed?.targets)) {
      return null;
    }
    return parsed as PendingPick;
  } catch {
    return null;
  }
}
