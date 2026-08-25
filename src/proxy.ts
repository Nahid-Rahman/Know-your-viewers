import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PROTECTED_PREFIXES = ["/researcher", "/streamer"];

// The stimulus ("/", "/about", "/support", "/terms", "/entry", "/debrief",
// "/survey") and the auth pages themselves are intentionally left public —
// requiring an account there would break participant anonymity.
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  // Scaffold state: .env has no Supabase project yet. Skip enforcement
  // instead of crashing every researcher/streamer route — server actions
  // still call requireRole() themselves once wired to a real project.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const { data } = await supabase.auth.getUser();
  const isProtected = PROTECTED_PREFIXES.some((p) => request.nextUrl.pathname.startsWith(p));

  if (isProtected && !data.user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // This is a UX convenience only. The authoritative role/ownership check
  // lives in every server action — a redirect here is not a security
  // boundary by itself.
  return response;
}

export const config = {
  matcher: ["/researcher/:path*", "/streamer/:path*"],
};
