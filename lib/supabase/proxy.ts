import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // Public routes should not require auth (important for link previews / crawlers).
  const pathname = request.nextUrl.pathname;
  const PUBLIC_PREFIXES = [
    "/welcome",
    "/auth",
    "/og",
    "/opengraph-image",
    "/twitter-image",
    "/favicon.ico",
    "/robots.txt",
    "/sitemap.xml",
  ];

  // Allow public read-only browsing for most forum pages.
  // Keep write/admin sections protected.
  const FORUM_PUBLIC_PREFIX = "/forum";
  const FORUM_PROTECTED_PREFIXES = [
    "/forum/new",
    "/forum/me",
    "/forum/admin",
    "/forum/moderation",
  ];

  const isForumPublic =
    pathname === FORUM_PUBLIC_PREFIX || pathname.startsWith(FORUM_PUBLIC_PREFIX + "/")
      ? !FORUM_PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))
      : false;

  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/_next") ||
    isForumPublic ||
    PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (isPublic) {
    return supabaseResponse;
  }

  // If the env vars are not set, skip proxy check. You can remove this
  // once you setup the project.
  if (!hasEnvVars) {
    return supabaseResponse;
  }

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  if (!user) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
