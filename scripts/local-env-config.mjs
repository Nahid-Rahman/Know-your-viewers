import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const LOCAL_DB = {
  user: "postgres",
  password: "localdev",
  port: 54329,
  devDatabase: "livedrop_dev",
  testDatabase: "livedrop_test",
};

export function localDbUrl(database) {
  return `postgresql://${LOCAL_DB.user}:${LOCAL_DB.password}@127.0.0.1:${LOCAL_DB.port}/${database}`;
}

/**
 * A local-only encryption key, generated once into .localdb/ (gitignored).
 * Never the production CONTACT_ENCRYPTION_KEY — synthetic local data must not
 * be decryptable with the real key or vice versa.
 */
export function localEncryptionKey() {
  const root = path.resolve(import.meta.dirname, "..");
  const file = path.join(root, ".localdb", "contact-key.txt");
  if (!existsSync(file)) {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, randomBytes(32).toString("base64"));
  }
  return readFileSync(file, "utf8").trim();
}

/** Environment that points every tool at the local database and disconnects Supabase. */
export function localEnv(database = LOCAL_DB.devDatabase) {
  const url = localDbUrl(database);
  return {
    DATABASE_URL: url,
    DIRECT_URL: url,
    CONTACT_ENCRYPTION_KEY: localEncryptionKey(),
    // Empty (not unset) so Next.js / dotenv do not fill them back in from .env.
    NEXT_PUBLIC_SUPABASE_URL: "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
    SUPABASE_SERVICE_ROLE_KEY: "",
    LDA_LOCAL_DB: "1",
  };
}
