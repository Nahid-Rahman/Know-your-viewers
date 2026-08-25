import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/enums";

export class AuthError extends Error {}

/** Resolves the signed-in Supabase user to our mirrored User row, or null. */
export async function getCurrentUser() {
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
