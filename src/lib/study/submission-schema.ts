// Public entry form validation, shared by the client form and the server
// action (the server re-validates everything). Field order on the form:
//   1. Name (required)
//   2. Phone number (required)
//   3. Age group (required: Below 18 / 18–30 / 31+)
//   4. Email (optional)
//   5. In-game name with tag (optional)
//   6. Social contact (optional): Discord username and/or Facebook profile

import { z } from "zod";
import { FIELD_LIMITS, type InvalidReasonCode } from "./constants";
import { normalizePhone } from "./phone";

const optionalText = (max: number) =>
  z
    .string()
    .max(max * 2, `Must be ${max} characters or fewer.`)
    .optional()
    .transform((v) => v?.replace(/[\u0000-\u001f\u007f]/g, "").trim() ?? "")
    .refine((v) => v.length <= max, `Must be ${max} characters or fewer.`);

const DISCORD_RE = /^(?!.*\.\.)[A-Za-z0-9_.]{2,32}(#\d{4})?$/;
const FACEBOOK_URL_RE = /^https?:\/\/(www\.|m\.|web\.|mbasic\.)?(facebook|fb)\.com\/\S+$/i;

export const entryFormSchema = z
  .object({
    name: optionalText(FIELD_LIMITS.name).refine((v) => v.length >= 2, "Enter your name."),
    phone: z
      .string()
      .max(FIELD_LIMITS.phoneRaw, "That phone number is too long.")
      .superRefine((v, ctx) => {
        const r = normalizePhone(v);
        if (!r.ok) ctx.addIssue({ code: "custom", message: r.error });
      }),
    ageGroup: z.enum(["BELOW_18", "AGE_18_30", "AGE_31_PLUS"], { message: "Select your age group." }),
    email: optionalText(FIELD_LIMITS.email).refine(
      (v) => v === "" || z.email().safeParse(v).success,
      "Enter a valid email address, or leave it blank.",
    ),
    ign: optionalText(FIELD_LIMITS.ign),
    // Both social contacts are optional and independent.
    discord: optionalText(FIELD_LIMITS.discord),
    facebook: optionalText(FIELD_LIMITS.facebook),
  })
  .superRefine((v, ctx) => {
    if (v.discord && !DISCORD_RE.test(v.discord)) {
      ctx.addIssue({ code: "custom", path: ["discord"], message: "Enter a Discord username (2–32 letters, digits, _ or .)." });
    }
    if (v.facebook && /^https?:/i.test(v.facebook) && !FACEBOOK_URL_RE.test(v.facebook)) {
      ctx.addIssue({ code: "custom", path: ["facebook"], message: "Enter a facebook.com profile link or your profile name." });
    }
  });

export type EntryFormInput = z.input<typeof entryFormSchema>;
export type EntryFormValues = z.output<typeof entryFormSchema>;

/**
 * Bounded reason codes for a failed client-side validation. Uses the values
 * only to tell "missing" from "invalid"; returns codes, never values.
 */
export function invalidReasonCodes(fields: string[], values: Partial<Record<string, unknown>>): InvalidReasonCode[] {
  const empty = (k: string) => typeof values[k] !== "string" || (values[k] as string).trim() === "";
  const out = new Set<InvalidReasonCode>();
  for (const f of fields) {
    if (f === "name") out.add(empty("name") ? "NAME_MISSING" : "NAME_INVALID");
    else if (f === "phone") out.add(empty("phone") ? "PHONE_MISSING" : "PHONE_INVALID");
    else if (f === "ageGroup") out.add("AGE_MISSING");
    else if (f === "email") out.add("EMAIL_INVALID");
    else if (f === "ign") out.add("IGN_INVALID");
    else if (f === "discord") out.add("DISCORD_INVALID");
    else if (f === "facebook") out.add("FACEBOOK_INVALID");
  }
  return [...out].sort();
}
