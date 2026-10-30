// One-off: moves legacy plaintext support-request contact/message/nickname
// into the encrypted columns and clears the plaintext. Idempotent. Run with
// the same CONTACT_ENCRYPTION_KEY the app uses, after taking a backup:
//   npx tsx scripts/encrypt-support-requests.mts --dry-run
//   npx tsx scripts/encrypt-support-requests.mts
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { encryptContact } from "../src/lib/crypto";

const dryRun = process.argv.includes("--dry-run");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const rows = await prisma.supportRequest.findMany({
  where: { OR: [{ emailOrPhone: { not: null } }, { message: { not: null } }, { streamNickname: { not: null } }] },
});
console.log(`${rows.length} support request(s) with plaintext fields.${dryRun ? " (dry run — nothing changed)" : ""}`);
if (!dryRun) {
  for (const r of rows) {
    await prisma.supportRequest.update({
      where: { id: r.id },
      data: {
        encryptedContact: r.encryptedContact ?? (r.emailOrPhone ? encryptContact(r.emailOrPhone) : null),
        encryptedMessage: r.encryptedMessage ?? (r.message ? encryptContact(r.message) : null),
        encryptedNickname: r.encryptedNickname ?? (r.streamNickname ? encryptContact(r.streamNickname) : null),
        emailOrPhone: null,
        message: null,
        streamNickname: null,
      },
    });
  }
  console.log("Done.");
}
await prisma.$disconnect();
