"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, AuthError } from "@/lib/auth";
import { decryptContact } from "@/lib/crypto";
import type { ContactStatus, ContactOutcome, PrizeFulfillmentStatus } from "@/generated/prisma/enums";

function revalidateContacts() {
  revalidatePath("/researcher/outreach/contacts");
  revalidatePath("/researcher/participants");
}

export async function updateContactStatus(
  participantId: string,
  contactStatus: ContactStatus,
): Promise<{ error: string } | { ok: true }> {
  try {
    await requireRole("RESEARCHER");
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message };
    throw err;
  }

  await prisma.contactWorkflow.upsert({
    where: { participantId },
    update: { contactStatus },
    create: { participantId, contactStatus },
  });
  revalidateContacts();
  return { ok: true };
}

export async function assignResearcher(
  participantId: string,
  researcherAssignedId: string | null,
): Promise<{ error: string } | { ok: true }> {
  try {
    await requireRole("RESEARCHER");
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message };
    throw err;
  }

  await prisma.contactWorkflow.upsert({
    where: { participantId },
    update: { researcherAssignedId },
    create: { participantId, researcherAssignedId },
  });
  revalidateContacts();
  return { ok: true };
}

export async function setNextFollowup(
  participantId: string,
  nextFollowupAt: string | null,
): Promise<{ error: string } | { ok: true }> {
  try {
    await requireRole("RESEARCHER");
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message };
    throw err;
  }

  // Force UTC midnight explicitly — a bare "YYYY-MM-DD" string should parse as UTC per
  // spec, but relying on that silently pulled in the server's local offset here and
  // stored the wrong calendar day.
  const value = nextFollowupAt ? new Date(`${nextFollowupAt}T00:00:00.000Z`) : null;
  await prisma.contactWorkflow.upsert({
    where: { participantId },
    update: { nextFollowupAt: value },
    create: { participantId, nextFollowupAt: value },
  });
  revalidateContacts();
  return { ok: true };
}

export async function setPrizeFulfillment(
  participantId: string,
  prizeFulfillmentStatus: PrizeFulfillmentStatus,
): Promise<{ error: string } | { ok: true }> {
  try {
    await requireRole("RESEARCHER");
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message };
    throw err;
  }

  const deliveredAt = prizeFulfillmentStatus === "DELIVERED" ? new Date() : null;
  await prisma.contactWorkflow.upsert({
    where: { participantId },
    update: { prizeFulfillmentStatus, prizeDeliveredAt: deliveredAt },
    create: { participantId, prizeFulfillmentStatus, prizeDeliveredAt: deliveredAt },
  });
  revalidateContacts();
  return { ok: true };
}

export async function updateContactNotes(
  participantId: string,
  contactNotes: string,
): Promise<{ error: string } | { ok: true }> {
  try {
    await requireRole("RESEARCHER");
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message };
    throw err;
  }

  await prisma.contactWorkflow.upsert({
    where: { participantId },
    update: { contactNotes },
    create: { participantId, contactNotes },
  });
  revalidateContacts();
  return { ok: true };
}

const OUTCOME_TO_STATUS: Partial<Record<ContactOutcome, ContactStatus>> = {
  DEBRIEF_COMPLETED: "DEBRIEFED",
  UNREACHABLE: "UNREACHABLE",
};

export async function logContactAttempt(
  participantId: string,
  outcome: ContactOutcome,
  note?: string,
): Promise<{ error: string } | { ok: true }> {
  let researcher;
  try {
    researcher = await requireRole("RESEARCHER");
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message };
    throw err;
  }

  const nextStatus = OUTCOME_TO_STATUS[outcome] ?? "CONTACTED";
  await prisma.$transaction([
    prisma.contactAttempt.create({
      data: { participantId, outcome, note: note || null, researcherId: researcher.id },
    }),
    prisma.contactWorkflow.upsert({
      where: { participantId },
      update: { contactStatus: nextStatus },
      create: { participantId, contactStatus: nextStatus },
    }),
  ]);
  revalidateContacts();
  return { ok: true };
}

/** Only ever called from an explicit researcher click on the Contacts screen — never for list rendering. */
export async function revealContact(
  participantId: string,
): Promise<{ error: string } | { email: string | null; phone: string | null }> {
  try {
    await requireRole("RESEARCHER");
  } catch (err) {
    if (err instanceof AuthError) return { error: err.message };
    throw err;
  }

  const contact = await prisma.participantContact.findUnique({ where: { participantId } });
  if (!contact) return { error: "No contact info on file for this participant." };

  // encryptedValue holds the email when one was given, otherwise the phone
  // (see the ParticipantContact model comment). Classify by the decrypted
  // value's own shape rather than trusting `emailHash` presence — some
  // historical rows have a stale/missing hash even though the value is an
  // email, and this way display is correct either way.
  const primary = decryptContact(contact.encryptedValue);
  const primaryIsEmail = primary.includes("@");

  const email = primaryIsEmail ? primary : null;
  const phone = contact.encryptedPhone ? decryptContact(contact.encryptedPhone) : primaryIsEmail ? null : primary;

  return { email, phone };
}
