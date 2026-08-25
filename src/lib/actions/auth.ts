"use server";

import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/enums";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["RESEARCHER", "STREAMER"]),
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

export async function register(
  values: z.infer<typeof registerSchema>,
): Promise<{ error: string } | { needsEmailConfirmation: true } | { role: Role }> {
  if (!supabaseConfigured()) return { error: SUPABASE_NOT_CONFIGURED };

  const parsed = registerSchema.safeParse(values);
  if (!parsed.success) return { error: "Please check the form for errors." };
  const { name, email, password, role } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error || !data.user) return { error: error?.message ?? "Registration failed." };

  const user = await prisma.user.create({
    data: { supabaseId: data.user.id, name, email, role },
  });

  // The register form doesn't collect streamer-specific details — create a
  // placeholder profile the streamer fills in from /streamer/profile.
  if (role === "STREAMER") {
    await prisma.streamer.create({
      data: {
        userId: user.id,
        displayName: name,
        platform: "Twitch",
        channelUrl: "",
        category: "Unspecified",
        status: "PENDING",
      },
    });
  }

  // Supabase projects with email confirmation on won't return a session yet.
  if (!data.session) return { needsEmailConfirmation: true };

  return { role: user.role };
}
