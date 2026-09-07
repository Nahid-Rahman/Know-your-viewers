// Free, no-install database backup — the Supabase project is on the Free
// plan, which has no automatic backups at all. Run this before/after any
// real data-collection session: `npm run backup`.
//
// Dumps every table's data as INSERT statements (in foreign-key-safe order),
// NOT the schema — restore by running `prisma migrate deploy` against a
// fresh database first, then executing the generated .sql file. Contact
// values stay exactly as encrypted in the database; this script never
// decrypts anything.

import pg from "pg";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import "dotenv/config";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

// 1. All base tables in the public schema.
const tablesRes = await client.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`);
const allTables = tablesRes.rows.map((r) => r.tablename);

// 2. Foreign-key edges, so parent tables are always inserted before the children that reference them.
const fkRes = await client.query(`
  SELECT tc.table_name AS child, ccu.table_name AS parent
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
`);
const dependsOn = Object.fromEntries(allTables.map((t) => [t, new Set()]));
for (const { child, parent } of fkRes.rows) {
  if (child !== parent && dependsOn[child]) dependsOn[child].add(parent);
}

// 3. Topological sort (parents first); a cycle guard keeps this safe even if a self-reference sneaks in.
const sortedTables = [];
const visited = new Set();
function visit(table, stack = new Set()) {
  if (visited.has(table) || stack.has(table)) return;
  stack.add(table);
  for (const parent of dependsOn[table] ?? []) visit(parent, stack);
  visited.add(table);
  sortedTables.push(table);
}
allTables.forEach((t) => visit(t));

function formatValue(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (value instanceof Date) return `'${value.toISOString()}'`;
  if (Array.isArray(value)) return `ARRAY[${value.map(formatValue).join(", ")}]`;
  if (typeof value === "object") return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  return `'${String(value).replace(/'/g, "''")}'`;
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = path.join(process.cwd(), "backups");
mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `backup-${timestamp}.sql`);

const lines = [
  `-- LiveDrop Arena data backup — ${new Date().toISOString()}`,
  `-- Restore: run \`prisma migrate deploy\` against a fresh database, then execute this file.`,
  "",
  "BEGIN;",
  "",
];

let totalRows = 0;
for (const table of sortedTables) {
  const res = await client.query(`SELECT * FROM "${table}"`);
  if (res.rows.length === 0) continue;
  const columns = res.fields.map((f) => f.name);
  lines.push(`-- Table: ${table} (${res.rows.length} rows)`);
  for (const row of res.rows) {
    const values = columns.map((c) => formatValue(row[c]));
    lines.push(`INSERT INTO "${table}" (${columns.map((c) => `"${c}"`).join(", ")}) VALUES (${values.join(", ")});`);
  }
  lines.push("");
  totalRows += res.rows.length;
}
lines.push("COMMIT;");

writeFileSync(outFile, lines.join("\n"));
await client.end();

console.log(`Backup complete: ${outFile}`);
console.log(`${totalRows} rows across ${sortedTables.filter((t) => t).length} tables checked.`);
