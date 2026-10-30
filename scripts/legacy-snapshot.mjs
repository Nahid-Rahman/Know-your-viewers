// Migration check: `snapshot` records row counts, response codes and contact
// ciphertext digests of the legacy tables; `verify` confirms they are
// unchanged after applying new migrations. Local databases only.
import pg from "pg";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const [mode, file = ".localdb/legacy-snapshot.json"] = process.argv.slice(2);
const url = process.env.DATABASE_URL ?? "";
if (!/@(127\.0\.0\.1|localhost):/.test(url)) {
  console.error("Refusing to run: DATABASE_URL is not a local database.");
  process.exit(1);
}

const TABLES = [
  "participants", "participant_contacts", "consents", "debriefs", "engagement_events",
  "responses", "contact_workflows", "contact_attempts", "interview_consents", "interviews",
  "research_eligibility", "support_requests", "conditions", "experiments", "stream_sessions",
  "tracking_links", "streamers", "users", "site_content",
];

const client = new pg.Client({ connectionString: url });
await client.connect();
const snap = { counts: {}, codes: [], contactDigest: "", conditionAssignments: [] };
for (const t of TABLES) snap.counts[t] = Number((await client.query(`SELECT count(*) FROM "${t}"`)).rows[0].count);
snap.codes = (await client.query(`SELECT "anonymousCode" FROM participants ORDER BY "anonymousCode"`)).rows.map((r) => r.anonymousCode);
snap.conditionAssignments = (await client.query(`SELECT id, "conditionId" FROM participants ORDER BY id`)).rows;
const contacts = (await client.query(`SELECT "participantId", "encryptedValue", "encryptedPhone" FROM participant_contacts ORDER BY "participantId"`)).rows;
snap.contactDigest = createHash("sha256").update(JSON.stringify(contacts)).digest("hex");
await client.end();

if (mode === "snapshot") {
  writeFileSync(file, JSON.stringify(snap, null, 2));
  console.log("Snapshot written:", JSON.stringify(snap.counts));
} else {
  const before = JSON.parse(readFileSync(file, "utf8"));
  const same = JSON.stringify(before) === JSON.stringify(snap);
  console.log(same ? "OK: legacy records, codes, condition assignments and contact ciphertext unchanged." : "MISMATCH");
  if (!same) {
    console.log("before", before.counts);
    console.log("after ", snap.counts);
    process.exit(1);
  }
}
