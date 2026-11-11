const DEFAULT_AUTH_REDIRECT = "/dashboard";

const AUTH_ROUTE_PREFIXES = [
  "/login",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

/**
 * Sanitize a post-login redirect target so only safe relative internal app paths are allowed.
 */
export function getSafeRedirectPath(candidate: string | null | undefined): string {
  if (!candidate || typeof candidate !== "string") {
    return DEFAULT_AUTH_REDIRECT;
  }

  const trimmed = candidate.trim();
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.includes("\\") ||
    /[\u0000-\u001F\u007F]/.test(trimmed)
  ) {
    return DEFAULT_AUTH_REDIRECT;
  }

  try {
    const parsed = new URL(trimmed, "http://reviewpilot.local");
    if (parsed.origin !== "http://reviewpilot.local") {
      return DEFAULT_AUTH_REDIRECT;
    }

    const isAuthRoute = AUTH_ROUTE_PREFIXES.some(
      (prefix) => parsed.pathname === prefix || parsed.pathname.startsWith(`${prefix}/`)
    );
    if (isAuthRoute) {
      return DEFAULT_AUTH_REDIRECT;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return DEFAULT_AUTH_REDIRECT;
  }
}

