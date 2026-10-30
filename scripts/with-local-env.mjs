// Runs a command with every database/Supabase variable pointed at the local
// development database (see local-db.mjs), overriding anything in .env:
//
//   npm run local -- npx prisma migrate dev
//   npm run local -- npm run dev
//   LDA_LOCAL_DATABASE=livedrop_test npm run local -- npx prisma migrate reset --force

import { spawn } from "node:child_process";
import { localEnv, LOCAL_DB } from "./local-env-config.mjs";

const args = process.argv.slice(2);
if (!args.length) {
  console.error("Usage: npm run local -- <command> [args...]");
  process.exit(1);
}

const database = process.env.LDA_LOCAL_DATABASE || LOCAL_DB.devDatabase;
const child = spawn(args[0], args.slice(1), {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, ...localEnv(database) },
});
child.on("exit", (code) => process.exit(code ?? 1));
