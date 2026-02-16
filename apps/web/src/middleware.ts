import { NextRequest, NextResponse } from "next/server";

/** Pages that don't require authentication. */
const PUBLIC_PAGES = ["/", "/login", "/register"];

const AUTH_PAGES = ["/login", "/register"];

/**
 * Edge middleware for route protection.
 *
 * Since we store tokens in localStorage (not cookies), the middleware uses a
 * lightweight cookie flag set by the client to signal auth state. This
 * prevents a flash of the wrong page on hard navigation.
 */
const TOKEN_COOKIE = "docpilot_has_token";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasToken = request.cookies.get(TOKEN_COOKIE)?.value === "1";

  // Authenticated user visiting login/register → redirect to dashboard
  if (AUTH_PAGES.includes(pathname) && hasToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Unauthenticated user visiting a protected page → redirect to login
  if (
    !PUBLIC_PAGES.includes(pathname) &&
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/_next") &&
    !pathname.includes(".") &&
    !hasToken
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
