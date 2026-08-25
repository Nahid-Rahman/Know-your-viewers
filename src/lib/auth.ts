import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/enums";

export class AuthError extends Error {}

/** Resolves the signed-in Supabase user to our mirrored User row, or null. */
export async function getCurrentUser() {
  // Scaffold state: no Supabase project connected yet. Treat as signed-out
  // rather than crashing every protected page (see proxy.ts's same check).
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  return prisma.user.findUnique({ where: { supabaseId: data.user.id } });
}

/**
 * Throws unless the current session belongs to a user with `role`. Every
 * server action that mutates researcher/streamer data must call this —
 * the proxy's redirect is UX only, not an authorization boundary.
 */
export async function requireRole(role: Role) {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Not signed in.");
  if (user.role !== role) throw new AuthError(`This action requires the ${role} role.`);
  return user;
}

/**
 * For Server Components rendering a protected page (not server actions,
 * which should return `{ error }` instead): redirects to /login on failure
 * rather than throwing into the error boundary.
 */
export async function requireRoleOrRedirect(role: Role) {
  try {
    return await requireRole(role);
  } catch (err) {
    if (err instanceof AuthError) redirect("/login");
    throw err;
  }
}
