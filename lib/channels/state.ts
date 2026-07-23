import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Signs tenant_id into the OAuth `state` param so the callback can
// trust it without a server-side session store. Reuses the existing
// tenant-key encryption secret purely as an HMAC key — no decryption
// involved, just CSRF/tamper protection on the redirect round-trip.
function stateSecret(): string {
  const secret = process.env.TENANT_KEY_ENCRYPTION_SECRET;
  if (!secret) throw new Error("Missing TENANT_KEY_ENCRYPTION_SECRET env var.");
  return secret;
}

export function signState(tenant_id: string): string {
  const payload = Buffer.from(JSON.stringify({ tenant_id, nonce: Date.now() })).toString("base64url");
  const sig = createHmac("sha256", stateSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyState(state: string): string | null {
  const [payload, sig] = state.split(".");
  if (!payload || !sig) return null;

  const expected = createHmac("sha256", stateSecret()).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const { tenant_id } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof tenant_id === "string" ? tenant_id : null;
  } catch {
    return null;
  }
}
