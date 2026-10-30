# LiveDrop Arena — Thesis Livestream Study Platform

Research platform for a thesis on **streamer trust, engagement and personal
information disclosure**, run with real collaborating streamers. It has two
parts:

- **The public study page** (`/`, `/entry/received`, `/support`, `/about`,
  `/terms`). One URL, branded for whichever stream session is currently
  active. Visitors spin a reward wheel and can submit an entry into a BDT 100
  bKash prize draw.
- **The researcher panel** (`/researcher/*`). Configure sessions, record
  stream timing and platform metrics, review submissions and duplicates,
  record follow-up and permissions, run the draw, and export data. Streamer
  accounts (`/streamer/*`) see only their assigned studies in aggregate.

> Passing tests is not ethics approval. Real participants must not be
> recruited until the supervisor and the ethics board have approved the
> pending decisions listed under **Study decisions** in the panel (see
> `docs/STUDY_REVISION.md`).

## Study design as implemented

- **Sessions run one at a time.** A session is either **A — Normal**
  (no website; only platform metrics) or **B — Study** (website link in the
  stream description). Only one B session can be active; activation refuses
  overlap.
- **Same experience per session.** Every visitor to a session sees the same
  versioned configuration: streamer branding, copy, wheel and form. Saving a
  change creates a new immutable version, and visits and submissions record
  the version they saw. Random per-viewer factorial conditions are no longer
  used; legacy assignments are kept untouched.
- **Form fields.**
  - Required: phone number and age group (Below 18 / 18–30 / 31+).
  - Optional: email, in-game name, and one social contact (Discord username
    *or* Facebook profile).
  - There is no streamer dropdown. Nothing is fetched from social URLs.
- **Every genuine submission is saved.** A phone already used in the same
  campaign is saved as a **DUPLICATE** linked to the canonical (first) entry,
  with its own response code. The canonical claim is race-safe (a primary-key
  insert on `campaign_phone_entries`). Retries and double clicks reuse an
  idempotency key, so they don't create duplicates.
- **Phone normalization.** Phones are normalized to `+E.164`
  (`01XXXXXXXXX`, `8801…`, `+880 1…` and `00880…` all match), then hashed
  with HMAC for matching. Contact values are AES-256-GCM encrypted.
- **Entry window.** Entries stay open until **actual stream end + 2 hours**,
  enforced with server time. Admin times are entered in Asia/Dhaka and stored
  in UTC. Corrections are logged.
- **Server-authoritative wheel.** The outcome is chosen and stored on the
  server, and the mechanism is recorded honestly (`FIXED` or
  `WEIGHTED_RANDOM`). The wheel result is never a draw win.
- **Draw.**
  - Uses canonical entries only, picked with a CSPRNG without replacement.
  - The eligible snapshot is stored, and a finalized draw can't be rerun.
  - The winner count must be an approved decision; it is never defaulted or
    silently reduced.
  - Payout status is tracked separately from winning.
- **Tracking.**
  - Visits are created by client JavaScript only, so link previews and bare
    server renders don't count.
  - A visit ends after 30 minutes without activity.
  - Reward-section views require 50% visibility for 1 second.
  - Heartbeats every 15 s while the tab is visible; active time is capped and
    merged across tabs.
  - No field values, keystrokes or contact data are sent to analytics.
- **Permissions.** Interview, website-data use and interview-answer use are
  separate append-only histories, each with a script version, method and
  recorder. Research exports include only canonical, non-test, adult entries
  with website-data use GRANTED. Declining research use never removes reward
  eligibility.

## Security model

- **No public sign-up.** Researcher and streamer accounts are created with
  `scripts/create-account.mts`, or from the Streamers screen.
- **Scoped access.** Every researcher query, action and export is scoped to
  experiments the user owns or collaborates on, with roles RESEARCHER or
  VIEWER. Contact reveal and sensitive exports need researcher-level access
  and are audited (`/researcher/audit`).
- **Visitor cookie.** The visitor cookie (`ldv`) is an opaque random token;
  only its SHA-256 is stored. Response codes are CSPRNG-generated and grant no
  access.
- **Supabase lock-down.** The 2026-10-31 migration enables RLS (deny-all) on
  every table and revokes the `anon`/`authenticated` grants. The app uses
  Prisma as the table owner and is unaffected. **Verify this on the live
  project after deploying.**
- **Server-side limits.** Public endpoints have server validation, size
  limits and Postgres-backed rate limits. CSV exports neutralize formula
  cells.

## Tech stack

Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui, Prisma 7
(`@prisma/adapter-pg`), PostgreSQL via Supabase, Supabase Auth, zod, Recharts,
Vitest, puppeteer-core.

## Project layout

```
src/
  app/(stimulus)/          public pages (homepage = active session)
  app/researcher/          panel: campaigns, sessions, submissions, audit, datasets
  app/api/study/activity   heartbeat/visibility beacon endpoint
  app/api/researcher/      CSV exports (study-export = revised flow)
  features/study/          public homepage, wheel, entry form, visit tracking
  features/study-admin/    panel forms (config editor, timing, policy, draw…)
  lib/study/               core rules: visits, submissions, duplicates, draw,
                           permissions, stats, exports, retention, access
  lib/actions/             server actions (study-public, study-admin, legacy)
prisma/                    schema + migrations
scripts/                   local DB, demo seed, e2e, backup, admin scripts
tests/                     unit + integration tests (local test database)
docs/STUDY_REVISION.md     migration procedure, verification, open decisions
```

Legacy (pre-revision) records stay in place. The Participant, Condition and
EngagementEvent tables and the "Legacy" panel pages are kept for history.

## Local development (never against production)

`.env` points at the real Supabase project. Local work uses a disposable
embedded PostgreSQL and a local-only encryption key instead:

```bash
npm install
npm run localdb                                    # keep running (127.0.0.1:54329)
npm run local -- npx prisma migrate deploy         # local dev database
npm run local -- npx prisma db seed                # synthetic legacy data
npm run local -- npx tsx --conditions=react-server scripts/seed-study-demo.mts
LDA_DEV_AUTH_AS=researcher@example.edu npm run local -- npx next dev -p 3100
```

- `npm run local -- <cmd>` overrides `DATABASE_URL`, `DIRECT_URL`,
  `CONTACT_ENCRYPTION_KEY` and the Supabase variables. Everything goes to the
  local database.
- `LDA_DEV_AUTH_AS` signs you in as that local user. It works only under
  `next dev`, with `LDA_LOCAL_DB=1` and a localhost database URL.
- Open http://localhost:3100 (use `localhost`, not `127.0.0.1`).

## Checks

| Command | What it does |
|---|---|
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest: unit tests and integration tests (resets the local **test** database `livedrop_test`) |
| `npm run local -- npx next build` | Production build |
| `npm run local -- node scripts/e2e-local.mjs` | Browser checks and screenshots against the local dev server |

## Backups and retention

- `npm run backup` dumps the database configured in `.env` into `backups/`
  (gitignored, unencrypted, with no retention policy).
- The panel's retention clean-up acts only on **approved** retention periods
  and always previews first. It cannot remove data from backups taken earlier.
  Handle those under the approved retention decision.
