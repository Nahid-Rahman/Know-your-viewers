// Phone normalization for duplicate matching.
//
// Canonical representation: E.164 with a leading "+", digits only.
//   Bangladesh mobile numbers are accepted in any of these equivalent forms
//   and all normalize to "+8801XXXXXXXXX":
//     01712345678, +8801712345678, 8801712345678, 008801712345678,
//     "017 1234-5678", "+880 1712-345678"
//   Numbers from other countries are rejected (Bangladesh-only study).

export type PhoneResult = { ok: true; e164: string } | { ok: false; error: string };

const BD_MOBILE = /^01[3-9]\d{8}$/;

export function normalizePhone(raw: string): PhoneResult {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: "Enter your phone number." };
  if (!/^[+\d\s\-().]+$/.test(trimmed)) {
    return { ok: false, error: "Use digits only (spaces, dashes and a leading + are fine)." };
  }

  // Only Bangladesh mobile numbers are accepted (013–019 operators).
  let digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("880")) digits = digits.slice(2);
  if (BD_MOBILE.test(digits)) return { ok: true, e164: `+88${digits}` };

  return { ok: false, error: "Enter a valid Bangladesh mobile number, like 01XXXXXXXXX." };
}

/** Masked display, e.g. "+880 ••••••••78". Uses only the stored last two digits. */
export function maskPhone(tail: string | null | undefined): string {
  return tail ? `•••••••••${tail}` : "—";
}
