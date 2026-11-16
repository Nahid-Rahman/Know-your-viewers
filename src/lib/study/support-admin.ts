import "server-only";
import { prisma } from "@/lib/prisma";
import { AuthError } from "@/lib/auth-error";
import { decryptContact } from "@/lib/crypto";
import { accessibleExperimentIds, audit, type Actor } from "./access";

/**
 * Support requests aren't tied to a campaign directly. One whose response
 * code matches an entry belongs to that entry's campaign and is visible to
 * researchers who can read it; one without a matching code is visible to any
 * researcher with contact-level access to at least one campaign.
 * Contents (contact + message) are encrypted and only shown via an explicit,
 * audited open — never in the list.
 */

async function scopes(actor: Actor) {
  const [read, contact] = await Promise.all([accessibleExperimentIds(actor, "read"), accessibleExperimentIds(actor, "contact")]);
  return { read, contact };
}

export async function listSupportRequests(actor: Actor, limit = 200) {
  const { read, contact } = await scopes(actor);
  const requests = await prisma.supportRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, createdAt: true, issueType: true, responseCode: true, purgedAt: true },
  });
  const codes = [...new Set(requests.map((r) => r.responseCode).filter((c): c is string => Boolean(c)))];
  const subs = codes.length
    ? await prisma.submission.findMany({
        where: { responseCode: { in: codes } },
        select: { id: true, responseCode: true, experimentId: true, isTest: true },
      })
    : [];
  const byCode = new Map(subs.map((s) => [s.responseCode, s]));

  return requests.flatMap((r) => {
    const sub = r.responseCode ? byCode.get(r.responseCode) : undefined;
    if (sub ? !read.includes(sub.experimentId) : contact.length === 0) return [];
    return [
      {
        ...r,
        submission: sub ? { id: sub.id, isTest: sub.isTest } : null,
        canOpen: !r.purgedAt && (sub ? contact.includes(sub.experimentId) : contact.length > 0),
      },
    ];
  });
}

const CONTACT_LABELS: Record<string, string> = {
  name: "Name",
  phone: "Phone",
  email: "Email",
  ign: "In-game name",
  discord: "Discord",
  facebook: "Facebook",
  emailOrPhone: "Email or phone",
};

/** Decrypts one request for an authorised researcher and audits the view (without the values). */
export async function openSupportRequest(actor: Actor, id: string) {
  const r = await prisma.supportRequest.findUnique({ where: { id } });
  if (!r) throw new AuthError("Not found or not permitted.");
  const { contact } = await scopes(actor);
  const sub = r.responseCode
    ? await prisma.submission.findUnique({ where: { responseCode: r.responseCode }, select: { experimentId: true } })
    : null;
  if (sub ? !contact.includes(sub.experimentId) : contact.length === 0) throw new AuthError("Not found or not permitted.");

  const contactRows: { label: string; value: string }[] = [];
  const rawContact = r.encryptedContact ? decryptContact(r.encryptedContact) : r.emailOrPhone;
  if (rawContact) {
    let parsed: Record<string, string> | null = null;
    try {
      const j = JSON.parse(rawContact);
      if (j && typeof j === "object" && !Array.isArray(j)) parsed = j as Record<string, string>;
    } catch {
      // Older requests stored a single "email or phone" string.
    }
    for (const [k, v] of Object.entries(parsed ?? { emailOrPhone: rawContact })) {
      if (typeof v === "string" && v) contactRows.push({ label: CONTACT_LABELS[k] ?? k, value: v });
    }
  }
  const message = r.encryptedMessage ? decryptContact(r.encryptedMessage) : r.message;
  const nickname = r.encryptedNickname ? decryptContact(r.encryptedNickname) : r.streamNickname;
  if (nickname) contactRows.push({ label: "Stream nickname", value: nickname });

  await audit(prisma, {
    actorId: actor.id,
    action: "SUPPORT_REQUEST_VIEWED",
    entityType: "SupportRequest",
    entityId: r.id,
    experimentId: sub?.experimentId ?? null,
  });
  return { contact: contactRows, message: message ?? "" };
}
