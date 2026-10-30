// Disposable local PostgreSQL for development and tests — never the real
// Supabase project. Data lives in .localdb/ (gitignored); delete that folder
// to start from scratch. Keep this process running while you use the app:
//
//   npm run localdb          # starts Postgres on 127.0.0.1:54329
//   npm run local -- <cmd>   # runs <cmd> against it (see with-local-env.mjs)

import EmbeddedPostgres from "embedded-postgres";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { LOCAL_DB } from "./local-env-config.mjs";

const root = path.resolve(import.meta.dirname, "..");
const dataDir = path.join(root, ".localdb", "pgdata");
mkdirSync(path.dirname(dataDir), { recursive: true });

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: LOCAL_DB.user,
  password: LOCAL_DB.password,
  port: LOCAL_DB.port,
  persistent: true,
  // Supabase databases are UTF-8; Windows initdb would otherwise default to WIN1252.
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
  onLog: () => {},
});

const firstRun = !existsSync(path.join(dataDir, "PG_VERSION"));
if (firstRun) await pg.initialise();
await pg.start();
for (const db of [LOCAL_DB.devDatabase, LOCAL_DB.testDatabase]) {
  try {
    await pg.createDatabase(db);
  } catch {
    // already exists
  }
}

console.log(`Local Postgres ready on 127.0.0.1:${LOCAL_DB.port} (databases: ${LOCAL_DB.devDatabase}, ${LOCAL_DB.testDatabase}). Ctrl+C to stop.`);

async function shutdown() {
  await pg.stop();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
setInterval(() => {}, 1 << 30);
