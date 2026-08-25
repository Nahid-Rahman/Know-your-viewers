# LiveDrop Arena — Thesis Gaming Recruitment Research Platform

An academic research prototype for studying trust, engagement, and disclosure
behaviour in livestream gaming recruitment. The platform has two faces:

- **The stimulus** (`/`, `/about`, `/support`, `/terms`, `/entry/received`,
  `/debrief`, `/survey/*`) — the public-facing "LiveDrop Arena" viewer-reward
  page participants actually see, built to match the provided Figma design.
- **The instrument** (`/researcher/*`, `/streamer/*`) — the private dashboard
  researchers and streamer partners use to configure experiments, assign
  streamers, and review aggregated results.

## Ethics, by design

This system reproduces a persuasion pattern (urgency framing, social proof,
authority badges, a rigged reward reveal) for research purposes only. That
requires deliberate safeguards, which are load-bearing, not decorative:

- **Retroactive consent.** Every submission routes through a mandatory
  `/debrief` screen that discloses the deception, states which elements were
  simulated, and asks explicit permission to use the session's data.
  Declining queues the participant's contact details for deletion and
  excludes their behavioural data from analysis (`Debrief.permissionGiven`,
  `src/app/(stimulus)/debrief/page.tsx`).
- **Separated, encrypted contact data.** Email/phone live in
  `ParticipantContact`, a table apart from behavioural data, encrypted at
  rest with AES-256-GCM (`src/lib/crypto.ts`). It is never joined into
  analytics queries and never rendered in the researcher dashboard.
- **Anonymous-only telemetry.** `EngagementEvent` rows carry a type and a
  timestamp against an anonymous participant code — no IP address, user
  agent, referrer, or device fingerprint is ever stored.
- **Ethics gate.** An experiment cannot be moved to `ACTIVE` without an
  `ethicsApprovalRef` on file.
- **No account for participants.** `/researcher/*` and `/streamer/*` require
  sign-in; the stimulus and the whole participant journey stay
  unauthenticated by design — an account would break anonymity.

**Before running this with real participants:** confirm IRB/ethics approval
is on file, never deploy to a domain that could be mistaken for a real game
publisher's, and keep the "not affiliated" disclaimer in the stimulus
footer intact.

## Tech stack

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS v4 ·
shadcn/ui (`@base-ui/react` primitives) · Prisma 7 (`prisma-client`
generator + `@prisma/adapter-pg`) · PostgreSQL via Supabase · Supabase Auth
(`@supabase/ssr`) · react-hook-form + zod · Recharts.

## Project layout

```
src/
  app/
    (stimulus)/       public participant-facing pages — the Figma screens
    (auth)/           login, register — researcher/streamer only
    researcher/        dashboard, experiments, streamers, reports, settings
    streamer/          dashboard, assigned studies, profile
    api/               (Phase 6) tracking-link resolver, health check
  components/
    ui/                shadcn primitives
    common/             GlowCard, StatCard, EmptyState, RarityBadge, ...
    layout/             AppShell, SidebarNav, PageHeader
    charts/             BarChartCard, LineChartCard, DistributionChart
  features/
    stimulus/           stimulus config + sections + the reward-claim modal
    experiment/          researcher experiment-detail tab navigation
    survey/              QuestionRenderer + mock post-study survey
  lib/
    prisma.ts            PrismaClient singleton (pg driver adapter)
    auth.ts              getCurrentUser() / requireRole()
    crypto.ts            AES-256-GCM contact encryption
    supabase/            browser + server Supabase clients
    mock/                fixture data backing the instrument UI for now
  proxy.ts               session refresh + route guard (Next 16's middleware)
  types/                 shared domain types
prisma/
  schema.prisma
  seed.ts
```

## Setup

```bash
npm install
cp .env.example .env      # fill in Supabase + database values, see below
npx prisma generate
npx prisma migrate dev    # creates the schema in your Supabase Postgres
npx prisma db seed        # one researcher, two streamers, a full experiment
npm run dev
```

Open http://localhost:3000. The stimulus and every `/researcher`,
`/streamer` dashboard page render immediately against fixture data in
`src/lib/mock/` — you do not need a database filled in to browse the UI.
Real persistence (Phase 6: wiring server actions to Prisma) activates once
`.env` is filled in.

### Getting the values in `.env`

1. Create a Supabase project. Copy `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` from
   **Project Settings → API**.
2. Copy `DATABASE_URL` (pooled, port 6543) and `DIRECT_URL` (direct, port
   5432) from **Project Settings → Database**. Migrations need the direct
   connection; the app's runtime client uses the pooled one.
3. Generate `CONTACT_ENCRYPTION_KEY`:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
4. `ETHICS_APPROVAL_REF` is optional to fill in `.env` — it's recorded per
   experiment in the researcher dashboard, not globally.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type-check |
| `npx prisma studio` | Browse the database |
| `npx prisma migrate dev` | Apply schema changes |
| `npx prisma db seed` | Re-run the seed script |

## Current status

The stimulus (Face A) and the researcher/streamer instrument (Face B) are
fully built and navigable end-to-end against typed fixtures. The Prisma
schema, migrations tooling, Supabase Auth client/server helpers, route
guarding, and the contact-encryption helper are in place. Wiring every
server action to the live database (Phase 6 in the original plan) is the
next step once a real Supabase project is connected.
# Know-your-viewers
