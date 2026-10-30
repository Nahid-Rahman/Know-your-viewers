# Study revision (2026-10): migration, verification and open decisions

## 1. What the migration changes

Migration: `prisma/migrations/20261031000000_study_revision_v2/migration.sql`.

- **Additive only.** It adds 18 tables and new columns. Nothing is dropped and
  no existing column is renamed or narrowed.
- **Nullable support-request columns.**
  - `support_requests.emailOrPhone` and `message` become nullable.
  - New encrypted columns are added alongside them.
- **New `stream_sessions` columns.** These have defaults: `sessionType=STUDY`,
  `status=DRAFT`, `collectionMode=TEST`, plus actual/deadline times and
  `currentConfigId`.
  - Existing sessions therefore become draft TEST study sessions with no
    config. They are not public until a researcher saves a config and
    activates one.
- **New `experiments` column.** `duplicateScope` defaults to `CAMPAIGN`.
- **New streamer column.** `streamers.imageUrl` is added.
- **Supabase lock-down (hand-written block at the end).**
  - Enables RLS on every `public` table with no policies.
  - Revokes all table and sequence privileges from `anon` and `authenticated`,
    including default privileges for future tables.
  - The app connects as the table owner through Prisma and is unaffected.
  - The block is guarded, so it also runs on plain PostgreSQL.

**Legacy data is not rewritten.**

- Participants, response codes (`P-…`), condition assignments, contacts,
  events, consents and outreach records are left exactly as they are.
- No historical visit duration, age, consent or spin outcome is invented.
- In the revised views those fields are simply absent, so they count as
  unknown.
- Legacy pages remain under "Legacy …" in the panel.

**Optional data step:** `scripts/encrypt-support-requests.mts`.

- Moves legacy plaintext support-request fields into encrypted columns.
- Use `--dry-run` first.

## 2. Reviewed procedure for the live database

1. **Back up.** Run `npm run backup` and also take a Supabase dashboard
   backup/export. The Free plan has no automatic backups.
2. **Check the target.** Confirm `.env` `DIRECT_URL` points at the intended
   project.
3. **Check status.** Run `npx prisma migrate status`; only
   `20261031000000_study_revision_v2` should be pending.
4. **Apply.** Run `npx prisma migrate deploy`.
5. **Verify.** In the Supabase dashboard:
   - Security Advisor should show no "RLS disabled" warnings.
   - Table Editor → each table → "RLS enabled".
   - Optional: `curl "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/submissions?select=id" -H "apikey: <anon key>"`
     should return an error or an empty result, never rows.
6. **Encrypt support text (optional).**
   - Run `npx tsx scripts/encrypt-support-requests.mts --dry-run`.
   - Then run it without `--dry-run`.
7. **Create accounts.** Use `npx tsx scripts/create-account.mts --role RESEARCHER …`
   for anyone else who needs access, for example the supervisor as a VIEWER
   collaborator.
8. **Deploy the app.** Vercel deploy is done by the project owner. It was not
   done as part of this work.

### Rollback and recovery

- **App rollback.** Because the migration is additive, the previous app
  version keeps working against the migrated schema. The one exception is that
  old code writing `support_requests` still writes the plaintext columns, which
  remain present.
- **Schema rollback.** Restore the pre-migration backup. Don't hand-drop the
  tables if submissions were already collected.
- **RLS/grants rollback.** Only if something unexpected depended on the REST
  API. Re-enable this with explicit policies rather than disabling RLS.

### Tested against a synthetic copy

`scripts/legacy-snapshot.mjs` snapshots legacy row counts, response codes,
condition assignments and a digest of the contact ciphertext. It then verifies
they are identical after the migration. Result on the synthetic legacy
database:

> OK: legacy records, codes, condition assignments and contact ciphertext unchanged.

## 3. Definitions used in the software

| Term | Definition |
|---|---|
| Visit | Activity by one browser on one session. It ends after 30 min with no event or heartbeat (`VISIT_INACTIVITY_TIMEOUT_MS`). A config change or a new session starts a new visit. Visits are created only by client JS. |
| Browser | A first-party random cookie token (`ldv`, 90 days). It is not a person. Clearing cookies or switching device makes a new one, and a shared device merges people. |
| Elapsed time | `lastSeenAt − startedAt`, i.e. the last observed activity. It is not exact when the tab is closed abruptly. |
| Estimated active time | Heartbeats every 15 s while the tab is visible. Each credit is capped at 20 s and counted once per visit, never per tab. Hidden time and missing heartbeats are not counted. This is not verified attention. |
| Reward-section view | At least 50% of the wheel section on screen for 1 s while the tab is visible. |
| Duplicate scope | Same normalized phone within the same campaign (experiment), stored in `experiments.duplicateScope = CAMPAIGN`. |
| Canonical entry | The first otherwise-valid submission for a phone in the campaign. A duplicate is never auto-promoted; a correction is an explicit, audited action, blocked after a finalized draw. |
| Funnel rates | Each stage is a count of distinct visits. "of landing" uses landing-viewed visits as the denominator; "of previous" uses the previous stage. Event totals are shown separately. |
| Optional-field rates | Denominator: canonical submissions. |
| Live vs post-stream | Compared against the recorded **actual** start and end. If no actual start is recorded, the phase is "unknown". |
| Research-eligible | Canonical, non-test, age group not Below 18, latest WEBSITE_DATA_USE = GRANTED, not manually excluded, not purged. |
| Draw-eligible | Canonical, same test/live mode, not draw-excluded. Under-18 entries are included or excluded only per the approved decision. |

Implemented form order:

1. Phone (required)
2. Age group (required)
3. Email (optional)
4. In-game name (optional)
5. Social contact: Skip / Discord / Facebook (optional)

Removed from the new form: streamer dropdown, "Stream Nickname", favourite game
type, livestream frequency. Their historical values remain in the legacy
tables.

## 4. Decisions still pending (shown in the panel under *Decisions & Access*)

None of these are chosen by the software. LIVE collection is blocked until
every decision marked "required before live collection" is recorded as
approved. Pending decisions don't block TEST sessions with synthetic data.

- Final winner count: 10 or 20. Required before a live draw.
- Order of the draw and the follow-up interviews.
- Handling of unreachable participants. They stay "pending" and out of
  permission-dependent exports.
- Initial collection notice and the basis for collecting events and
  submissions. Required before live collection.
- Partial disclosure / deception procedure. Required before live collection.
- Under-18 collection and handling. Required before live collection.
- Under-18 contact and reward eligibility. Required before live collection and
  before a live draw.
- Retention periods, including backups. Required before live collection.
- Final public reward presentation, including any displayed-but-not-awarded
  items and the fixed bKash result. Required before live collection.

## 5. Production checks still outstanding

These cannot be verified from the repository.

- **RLS and grants** on the live Supabase project after migrating (see §2.5).
- **Supabase Auth settings.**
  - Disable public email sign-ups in the dashboard. The app no longer calls
    `signUp`, but the anon key can still call the Auth API directly.
  - Review the existing `users` rows for any self-registered RESEARCHER
    accounts.
- **Vercel environment.**
  - `CONTACT_ENCRYPTION_KEY` must be unchanged (existing ciphertext depends on
    it).
  - `NODE_ENV=production`.
  - `LDA_DEV_AUTH_AS` and `LDA_LOCAL_DB` must **not** be set.
- **Proxy headers.** `x-forwarded-for` is used for IP rate limiting; Vercel
  sets it.
- **Navigation labels.** The live `site_content` navigation still says
  "Spin & Win" / "Try Your Luck", and the footer says "For entertainment
  purposes only". Edit them in Settings → Stimulus Content if the approved
  wording differs.
- **Local backups.** The existing files in `backups/` contain research data.
  Handle them per the retention decision.
