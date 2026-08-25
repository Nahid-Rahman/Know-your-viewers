import { NextResponse } from "next/server";
import {
  PARTICIPANT_COOKIE,
  PARTICIPANT_COOKIE_MAX_AGE,
  createParticipant,
  resolveExperimentForNewParticipant,
} from "@/lib/participant";

/**
 * First-touch entry point for the stimulus: the landing page redirects here
 * whenever it finds no `ldp_pid` cookie, since a Server Component can't set
 * one itself. Creates the Participant (random Condition assignment), sets
 * the cookie, and redirects straight back — the landing page then renders
 * normally against a participant that now exists.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const ref = url.searchParams.get("ref");
  const dest = new URL("/", request.url);

  const resolved = await resolveExperimentForNewParticipant(ref);
  if (!resolved) return NextResponse.redirect(dest);

  const participant = await createParticipant(resolved.experiment, resolved.trackingLinkId);

  const response = NextResponse.redirect(dest);
  response.cookies.set(PARTICIPANT_COOKIE, participant.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: PARTICIPANT_COOKIE_MAX_AGE,
  });
  return response;
}
