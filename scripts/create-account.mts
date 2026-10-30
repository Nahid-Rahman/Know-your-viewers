// Trusted administrative account creation. Public registration no longer
// grants any role; researcher (and streamer) logins are created here by
// someone holding the Supabase service-role key, never from the browser.
//
//   npx tsx scripts/create-account.mts --role RESEARCHER --email prof@uni.edu --name "Prof. X"
//
// Prints a one-time temporary password (the person should change it). Uses
// .env, so double-check which project it points at before running.
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}
const role = arg("role");
const email = arg("email");
const name = arg("name");
if (!email || !name || (role !== "RESEARCHER" && role !== "STREAMER")) {
  console.error('Usage: npx tsx scripts/create-account.mts --role RESEARCHER|STREAMER --email you@example.com --name "Full Name"');
  process.exit(1);
}
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const tempPassword = randomBytes(12).toString("base64url");
const { data, error } = await supabase.auth.admin.createUser({ email, password: tempPassword, email_confirm: true });
if (error || !data.user) {
  console.error(`Supabase: ${error?.message ?? "user creation failed"}`);
  process.exit(1);
}
const user = await prisma.user.create({ data: { supabaseId: data.user.id, email, name, role } });
if (role === "STREAMER") {
  await prisma.streamer.create({
    data: { userId: user.id, displayName: name, platform: "YouTube", channelUrl: "", category: "Unspecified", status: "PENDING" },
  });
}
console.log(`Created ${role} ${email}. Temporary password (shown once): ${tempPassword}`);
await prisma.$disconnect();
