// Phone normalization for duplicate matching.
//
// Canonical representation: E.164 with a leading "+", digits only.
//   Bangladesh mobile numbers are accepted in any of these equivalent forms
//   and all normalize to "+8801XXXXXXXXX":
//     01712345678, +8801712345678, 8801712345678, 008801712345678,
//     "017 1234-5678", "+880 1712-345678"
//   Other countries must be entered with "+" or "00" and 8–15 digits, and
//   are kept as "+<digits>" without further interpretation.

export type PhoneResult = { ok: true; e164: string } | { ok: false; error: string };

const BD_MOBILE = /^01[3-9]\d{8}$/;

export function normalizePhone(raw: string): PhoneResult {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: "Enter your phone number." };
  if (!/^[+\d\s\-().]+$/.test(trimmed)) {
    return { ok: false, error: "Use digits only (spaces, dashes and a leading + are fine)." };
  }

  const hasPlus = trimmed.startsWith("+");
  let digits = trimmed.replace(/\D/g, "");
  if (!hasPlus && digits.startsWith("00")) digits = digits.slice(2);
  const international = hasPlus || trimmed.replace(/\D/g, "").startsWith("00");

  // Bangladesh: 01XXXXXXXXX locally, 8801XXXXXXXXX internationally.
  if (!international && BD_MOBILE.test(digits)) return { ok: true, e164: `+88${digits}` };
  if (digits.startsWith("880") && BD_MOBILE.test(digits.slice(2))) return { ok: true, e164: `+${digits}` };
  if (!international && digits.startsWith("880")) {
    return { ok: false, error: "That doesn't look like a valid Bangladesh mobile number." };
  }

  if (international) {
    if (digits.startsWith("880")) {
      return { ok: false, error: "That doesn't look like a valid Bangladesh mobile number." };
    }
    if (digits.length >= 8 && digits.length <= 15) return { ok: true, e164: `+${digits}` };
    return { ok: false, error: "Enter a full international number (8–15 digits)." };
  }

  return { ok: false, error: "Enter a Bangladesh mobile number like 01XXXXXXXXX, or include your country code with +." };
}

/** Masked display, e.g. "+880 ••••••••78". Uses only the stored last two digits. */
export function maskPhone(tail: string | null | undefined): string {
  return tail ? `•••••••••${tail}` : "—";
}
