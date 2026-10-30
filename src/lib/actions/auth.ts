"use server";

import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/enums";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const SUPABASE_NOT_CONFIGURED =
  "Supabase isn't connected yet — add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.";

function supabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export async function login(
  values: z.infer<typeof loginSchema>,
): Promise<{ error: string } | { role: Role }> {
  if (!supabaseConfigured()) return { error: SUPABASE_NOT_CONFIGURED };

  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) return { error: "Enter a valid email and password." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return { error: error?.message ?? "Sign-in failed." };

  const user = await prisma.user.findUnique({ where: { supabaseId: data.user.id } });
  if (!user) return { error: "Signed in, but no matching researcher/streamer account was found." };

  return { role: user.role };
}

/**
 * Public self-registration is disabled: it accepted a client-chosen role
 * (including RESEARCHER). Privileged accounts are created only through a
 * trusted process — scripts/create-account.mts, or a researcher creating a
 * streamer login from the Streamers screen.
 */
export async function register(): Promise<{ error: string }> {
  return { error: "Public registration is closed. Ask the research team for an account." };
}
