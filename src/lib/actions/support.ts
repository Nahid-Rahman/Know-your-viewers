"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { PARTICIPANT_COOKIE } from "@/lib/participant";

const supportSchema = z.object({
  emailOrPhone: z.string().min(3),
  responseCode: z.string().optional(),
  streamNickname: z.string().optional(),
  issueType: z.string().min(1),
  message: z.string().min(5),
});

export async function submitSupportRequest(
  values: z.infer<typeof supportSchema>,
): Promise<{ error: string } | { ok: true }> {
  const parsed = supportSchema.safeParse(values);
  if (!parsed.success) return { error: "Please check the form for errors." };

  const cookieStore = await cookies();
  const participantId = cookieStore.get(PARTICIPANT_COOKIE)?.value;

  await prisma.supportRequest.create({
    data: {
      participantId: participantId ?? undefined,
      emailOrPhone: parsed.data.emailOrPhone,
      responseCode: parsed.data.responseCode || null,
      streamNickname: parsed.data.streamNickname || null,
      issueType: parsed.data.issueType,
      message: parsed.data.message,
    },
  });

  return { ok: true };
}
