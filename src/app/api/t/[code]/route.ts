import { NextResponse } from "next/server";

/**
 * Tracking-link resolver: a streamer shares this URL. We don't validate or
 * touch the database here — the landing page (src/app/(stimulus)/page.tsx)
 * looks up the code itself when it creates the Participant, so an invalid
 * code just falls back to the active experiment with no assignment.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/t/[code]">) {
  const { code } = await ctx.params;
  const url = new URL("/", request.url);
  url.searchParams.set("ref", code);
  return NextResponse.redirect(url);
}
