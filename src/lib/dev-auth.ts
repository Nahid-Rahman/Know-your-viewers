// Local-only sign-in bypass for development and screenshot runs, since the
// local database has no Supabase Auth project behind it. Active only when ALL
// of these hold, so it cannot switch on in a deployed build:
//   - NODE_ENV is "development" (next dev; `next build`/`next start` set production)
//   - LDA_LOCAL_DB=1 and DATABASE_URL points at 127.0.0.1/localhost
//   - LDA_DEV_AUTH_AS names a user email in that local database

export function devAuthEmail(): string | null {
  const email = process.env.LDA_DEV_AUTH_AS;
  if (!email) return null;
  if (process.env.NODE_ENV !== "development") return null;
  if (process.env.LDA_LOCAL_DB !== "1") return null;
  if (!/@(127\.0\.0\.1|localhost):/.test(process.env.DATABASE_URL ?? "")) return null;
  return email;
}
