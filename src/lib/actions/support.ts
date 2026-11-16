"use server";

import { cookies, headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { decryptContact, encryptContact } from "@/lib/crypto";
import { PARTICIPANT_COOKIE } from "@/lib/participant";
import { FIELD_LIMITS } from "@/lib/study/constants";
import { maskPhone, normalizePhone } from "@/lib/study/phone";
import { allowRequest, PUBLIC_LIMITS } from "@/lib/study/rate-limit";
import { findVisitorByToken, VISITOR_COOKIE } from "@/lib/study/visits";

const CODE_RE = /^LD-[A-Z2-9]{4}-[A-Z2-9]{4}$/;
export type SupportContactField = "name" | "phone" | "email" | "ign" | "discord" | "facebook";
const CONTACT_FIELDS: SupportContactField[] = ["name", "phone", "email", "ign", "discord", "facebook"];

/** Per field: not on file, on file (value shown only to the browser that submitted), or masked. */
export type SupportFieldState = { onFile: false } | { onFile: true; value: string | null; masked?: string };
export type SupportLookup =
  | { found: false; error?: string }
  | { found: true; sameBrowser: boolean; fields: Record<SupportContactField, SupportFieldState> };

async function clientIp() {
  return (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

async function findEntry(rawCode: string) {
  const code = rawCode.trim().toUpperCase();
  if (!CODE_RE.test(code)) return null;
  return prisma.submission.findUnique({ where: { responseCode: code }, include: { contact: true } });
}

/**
 * Looks up an entry by response code so the support form can show which
 * details are already on file. Actual values are returned only to the
 * browser that made the entry (visitor cookie match); anyone else who has
 * the code just sees "on file" (phone masked) — a code alone never reveals
 * contact details.
 */
export async function lookupSupportEntry(rawCode: string): Promise<SupportLookup> {
  if (!(await allowRequest("support-lookup", await clientIp(), PUBLIC_LIMITS.supportLookupPerIp.limit, PUBLIC_LIMITS.supportLookupPerIp.windowMs))) {
    return { found: false, error: "Too many lookups — please try again later." };
  }
  const entry = await findEntry(rawCode);
  if (!entry) return { found: false };
  const visitor = await findVisitorByToken((await cookies()).get(VISITOR_COOKIE)?.value);
  const sameBrowser = Boolean(visitor && visitor.id === entry.visitorId);
  const c = entry.contact;
  const enc: Record<SupportContactField, string | null | undefined> = {
    name: c?.encryptedName,
    phone: c?.encryptedPhone,
    email: c?.encryptedEmail,
    ign: c?.encryptedIgn,
    discord: c?.encryptedDiscord,
    facebook: c?.encryptedFacebook,
  };
  const fields = {} as Record<SupportContactField, SupportFieldState>;
  for (const f of CONTACT_FIELDS) {
    const v = enc[f];
    fields[f] = v
      ? { onFile: true, value: sameBrowser ? decryptContact(v) : null, masked: f === "phone" ? maskPhone(c?.phoneTail) : undefined }
      : { onFile: false };
  }
  return { found: true, sameBrowser, fields };
}

const text = (max: number) => z.string().trim().max(max).optional().default("");
const supportSchema = z.object({
  responseCode: z.string().trim().max(20).optional().default(""),
  name: text(FIELD_LIMITS.name),
  phone: text(FIELD_LIMITS.phoneRaw),
  email: text(FIELD_LIMITS.email),
  ign: text(FIELD_LIMITS.ign),
  discord: text(FIELD_LIMITS.discord),
  facebook: text(FIELD_LIMITS.facebook),
  issueType: z.string().trim().min(1).max(60),
  message: z.string().trim().min(5).max(2000),
});
export type SupportInput = z.input<typeof supportSchema>;

/**
 * Support requests store contact details and message encrypted (never in the
 * legacy plaintext columns). Details the entry already has are not copied;
 * only what the person typed here is stored. The entry itself is never
 * changed by a support request.
 */
export async function submitSupportRequest(values: SupportInput): Promise<{ error: string } | { ok: true }> {
  const parsed = supportSchema.safeParse(values);
  if (!parsed.success) return { error: "Please check the form for errors." };
  const v = parsed.data;

  if (!(await allowRequest("support", await clientIp(), PUBLIC_LIMITS.supportPerIp.limit, PUBLIC_LIMITS.supportPerIp.windowMs))) {
    return { error: "Too many requests — please try again later." };
  }

  const entry = v.responseCode ? await findEntry(v.responseCode) : null;
  const hasName = Boolean(v.name) || Boolean(entry?.contact?.encryptedName);
  const hasPhone = Boolean(v.phone) || Boolean(entry?.contact?.encryptedPhone);
  if (!hasName) return { error: "Enter your name." };
  if (!hasPhone) return { error: "Enter your phone number." };
  let phone = "";
  if (v.phone) {
    const p = normalizePhone(v.phone);
    if (!p.ok) return { error: p.error };
    phone = p.e164;
  }
  if (v.email && !z.email().safeParse(v.email).success) return { error: "Enter a valid email address, or leave it blank." };

  const typed = Object.fromEntries(
    Object.entries({ name: v.name, phone, email: v.email, ign: v.ign, discord: v.discord, facebook: v.facebook }).filter(([, x]) => x),
  );

  const legacyId = (await cookies()).get(PARTICIPANT_COOKIE)?.value;
  const legacyParticipant =
    legacyId && /^[0-9a-f-]{36}$/.test(legacyId)
      ? await prisma.participant.findUnique({ where: { id: legacyId }, select: { id: true } })
      : null;

  await prisma.supportRequest.create({
    data: {
      participantId: legacyParticipant?.id ?? null,
      // JSON of the contact details typed on the support form (may be {} when
      // everything is already on the entry identified by responseCode).
      encryptedContact: encryptContact(JSON.stringify(typed)),
      encryptedMessage: encryptContact(v.message),
      responseCode: v.responseCode.toUpperCase() || null,
      issueType: v.issueType,
    },
  });
  return { ok: true };
}
