import { NextResponse } from "next/server";

/**
 * Former first-touch endpoint of the legacy flow, which created a Participant
 * for every cookie-less request (including link-preview bots) and could loop
 * with "/" when no experiment was active. The revised homepage creates visits
 * client-side instead, so this now only forwards to "/" (keeping ?ref=).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const dest = new URL("/", request.url);
  const ref = url.searchParams.get("ref");
  if (ref) dest.searchParams.set("ref", ref.slice(0, 64));
  return NextResponse.redirect(dest);
}
