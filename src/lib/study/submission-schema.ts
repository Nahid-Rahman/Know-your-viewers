// Public entry form validation, shared by the client form and the server
// action (the server re-validates everything). Field order on the form:
//   1. Phone number (required)
//   2. Age group (required: Below 18 / 18–30 / 31+)
//   3. Email (optional)
//   4. In-game name (optional)
//   5. Social contact (optional): choose Discord username OR Facebook profile, or skip

import { z } from "zod";
import { FIELD_LIMITS } from "./constants";
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
    socialType: z.enum(["", "DISCORD", "FACEBOOK"]).optional().default(""),
    socialHandle: optionalText(FIELD_LIMITS.facebook),
  })
  .superRefine((v, ctx) => {
    if (!v.socialType && v.socialHandle) {
      ctx.addIssue({ code: "custom", path: ["socialType"], message: "Choose Discord or Facebook, or clear the field." });
    }
    if (v.socialType === "DISCORD" && v.socialHandle) {
      if (v.socialHandle.length > FIELD_LIMITS.discord || !DISCORD_RE.test(v.socialHandle)) {
        ctx.addIssue({ code: "custom", path: ["socialHandle"], message: "Enter a Discord username (2–32 letters, digits, _ or .)." });
      }
    }
    if (v.socialType === "FACEBOOK" && v.socialHandle && /^https?:/i.test(v.socialHandle) && !FACEBOOK_URL_RE.test(v.socialHandle)) {
      ctx.addIssue({ code: "custom", path: ["socialHandle"], message: "Enter a facebook.com profile link or your profile name." });
    }
  });

export type EntryFormInput = z.input<typeof entryFormSchema>;
export type EntryFormValues = z.output<typeof entryFormSchema>;
