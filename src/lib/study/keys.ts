import "server-only";
import { createHash, createHmac, hkdfSync, randomBytes, randomInt } from "node:crypto";

// Purpose-specific keys derived from CONTACT_ENCRYPTION_KEY with HKDF, so the
// phone-matching HMAC and rate-limit hashing never reuse the encryption key
// directly and no extra secret has to be provisioned.
function derivedKey(info: string): Buffer {
  const raw = process.env.CONTACT_ENCRYPTION_KEY;
  if (!raw) throw new Error("CONTACT_ENCRYPTION_KEY is not set.");
  return Buffer.from(hkdfSync("sha256", Buffer.from(raw, "base64"), Buffer.alloc(0), info, 32));
}

/** Keyed hash of a canonical (+E.164) phone — the duplicate-matching key. */
export function hashPhone(e164: string): string {
  return createHmac("sha256", derivedKey("livedrop/phone-match/v1")).update(e164).digest("hex");
}

/** Keyed hash for rate-limit buckets (visitor ids, client IPs). */
export function hashRateLimitKey(value: string): string {
  return createHmac("sha256", derivedKey("livedrop/rate-limit/v1")).update(value).digest("hex").slice(0, 40);
}

/** Opaque browser token for the visitor cookie, and its stored digest. */
export function newVisitorToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashVisitorToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// 31 characters without 0/O/1/I/L to avoid transcription mistakes over the phone.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** "LD-XXXX-XXXX" from a CSPRNG (~39.6 bits). Collisions are retried by the caller. */
export function generateResponseCode(): string {
  let s = "";
  for (let i = 0; i < 8; i++) s += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return `LD-${s.slice(0, 4)}-${s.slice(4)}`;
}
