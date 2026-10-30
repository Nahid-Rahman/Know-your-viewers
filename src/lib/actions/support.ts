"use server";

import { cookies, headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { encryptContact } from "@/lib/crypto";
import { PARTICIPANT_COOKIE } from "@/lib/participant";
import { allowRequest, PUBLIC_LIMITS } from "@/lib/study/rate-limit";

const supportSchema = z.object({
  emailOrPhone: z.string().trim().min(3).max(254),
  responseCode: z.string().trim().max(20).optional(),
  issueType: z.string().trim().min(1).max(60),
  message: z.string().trim().min(5).max(2000),
});

/**
 * Support requests store contact and message text encrypted (never in the
 * legacy plaintext columns). The response code is kept as typed for lookup by
 * the team, and is never used to reveal anything to the requester.
 */
export async function submitSupportRequest(values: z.input<typeof supportSchema>): Promise<{ error: string } | { ok: true }> {
  const parsed = supportSchema.safeParse(values);
  if (!parsed.success) return { error: "Please check the form for errors." };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await allowRequest("support", ip, PUBLIC_LIMITS.supportPerIp.limit, PUBLIC_LIMITS.supportPerIp.windowMs))) {
    return { error: "Too many requests — please try again later." };
  }

  const legacyId = (await cookies()).get(PARTICIPANT_COOKIE)?.value;
  const legacyParticipant =
    legacyId && /^[0-9a-f-]{36}$/.test(legacyId)
      ? await prisma.participant.findUnique({ where: { id: legacyId }, select: { id: true } })
      : null;

  await prisma.supportRequest.create({
    data: {
      participantId: legacyParticipant?.id ?? null,
      encryptedContact: encryptContact(parsed.data.emailOrPhone),
      encryptedMessage: encryptContact(parsed.data.message),
      responseCode: parsed.data.responseCode?.toUpperCase() || null,
      issueType: parsed.data.issueType,
    },
  });
  return { ok: true };
}
