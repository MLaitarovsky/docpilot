import { NextRequest, NextResponse } from "next/server";

const AUTH_PAGES = ["/login", "/register"];

/**
 * Edge middleware for route protection.
 *
 * Reads the access token from the `docpilot_access_token` cookie (or falls
 * back to checking whether the token would be in localStorage — but since
 * middleware runs on the edge we can only rely on cookies). To keep it simple
 * we check for a cookie that the client sets.
 *
 * NOTE: Since we store tokens in localStorage (not cookies), the middleware
 * uses a lightweight cookie flag set by the client to signal auth state.
 * This prevents a flash of wrong page on hard navigation.
 */
const TOKEN_COOKIE = "docpilot_has_token";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasToken = request.cookies.get(TOKEN_COOKIE)?.value === "1";

  // Authenticated user visiting login/register → redirect to dashboard
  if (AUTH_PAGES.includes(pathname) && hasToken) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Unauthenticated user visiting a protected page → redirect to login
  // Only protect non-auth, non-api, non-static routes
  if (
    !AUTH_PAGES.includes(pathname) &&
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
