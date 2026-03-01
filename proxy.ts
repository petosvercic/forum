import { updateSession } from "@/lib/supabase/proxy";
import { NextResponse, type NextRequest } from "next/server";

// Public routes must bypass auth redirects (important for crawlers + share previews)
const PUBLIC_PATHS = new Set(["/", "/welcome", "/robots.txt", "/sitemap.xml", "/favicon.ico"]);
const PUBLIC_PREFIXES = ["/auth", "/og", "/opengraph-image", "/twitter-image"];

// Allow public read-only browsing for most forum pages.
// Keep write/admin sections protected.
const FORUM_PUBLIC_PREFIX = "/forum";
const FORUM_PROTECTED_PREFIXES = ["/forum/new", "/forum/me", "/forum/admin", "/forum/moderation"];

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/_next")) return true;

  // Public forum browse (feed, categories, posts, people, profiles)
  if (pathname === FORUM_PUBLIC_PREFIX || pathname.startsWith(FORUM_PUBLIC_PREFIX + "/")) {
    const isProtected = FORUM_PROTECTED_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(p + "/"),
    );
    if (!isProtected) return true;
  }

  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
