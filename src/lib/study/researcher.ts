import "server-only";
import { requireRole, requireRoleOrRedirect } from "@/lib/auth";
import { accessibleExperimentIds, type AccessLevel } from "./access";

/** For researcher pages: the signed-in researcher and the experiments they may access. */
export async function researcherScope(level: AccessLevel = "read") {
  const user = await requireRoleOrRedirect("RESEARCHER");
  return { user, scope: await accessibleExperimentIds(user, level) };
}

/** For server actions / route handlers (throws AuthError instead of redirecting). */
export async function researcherScopeOrThrow(level: AccessLevel = "read") {
  const user = await requireRole("RESEARCHER");
  return { user, scope: await accessibleExperimentIds(user, level) };
}

/** Experiment pages: 404 unless the signed-in researcher may access this experiment. */
export async function requireExperimentPage(experimentId: string, level: AccessLevel = "read") {
  const { user, scope } = await researcherScope(level);
  if (!scope.includes(experimentId)) {
    const { notFound } = await import("next/navigation");
    notFound();
  }
  return user;
}
