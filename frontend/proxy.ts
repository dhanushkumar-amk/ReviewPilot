import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { getSafeRedirectPath } from "./src/lib/safe-redirect";

const PROTECTED_APP_PREFIXES = [
  "/dashboard",
  "/billing",
  "/docs",
  "/findings",
  "/pull-requests",
  "/repositories",
  "/rules",
  "/scans",
  "/settings",
  "/support",
  "/team",
];

const GUEST_ONLY_AUTH_ROUTES = ["/login", "/sign-up"];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSessionCookie = Boolean(getSessionCookie(request));

  if (matchesPrefix(pathname, PROTECTED_APP_PREFIXES) && !hasSessionCookie) {
    const safeNext = getSafeRedirectPath(`${pathname}${search}`);
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", safeNext);
    return NextResponse.redirect(loginUrl);
  }

  if (
    matchesPrefix(pathname, GUEST_ONLY_AUTH_ROUTES) &&
    hasSessionCookie &&
    !request.nextUrl.searchParams.has("reauth")
  ) {
    const safeTarget = getSafeRedirectPath(request.nextUrl.searchParams.get("next"));
    return NextResponse.redirect(new URL(safeTarget, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/billing/:path*",
    "/docs/:path*",
    "/findings/:path*",
    "/pull-requests/:path*",
    "/repositories/:path*",
    "/rules/:path*",
    "/scans/:path*",
    "/settings/:path*",
    "/support/:path*",
    "/team/:path*",
    "/login",
    "/sign-up",
  ],
};

