import { execSync } from "node:child_process";
import { localEnv, LOCAL_DB } from "../../scripts/local-env-config.mjs";

export default function setup() {
  const env = { ...process.env, ...localEnv(LOCAL_DB.testDatabase) };
  if (!/@127\.0\.0\.1:/.test(env.DATABASE_URL)) throw new Error("Refusing to migrate a non-local database.");
  execSync("npx prisma migrate reset --force", { env: { ...env, PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: "local test database livedrop_test" }, stdio: "pipe" });
}
