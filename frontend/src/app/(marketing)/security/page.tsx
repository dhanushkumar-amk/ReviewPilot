import * as React from "react";
import {
  buildLegalMetadata,
  LegalDocument,
  type LegalSection,
} from "@/src/components/legal/legal-document";

export const metadata = buildLegalMetadata(
  "Security",
  "Security controls, encryption, authentication architecture, and responsible disclosure at ReviewPilot."
);

const sections: LegalSection[] = [
  {
    id: "authentication-controls",
    title: "Authentication, OAuth & Session Security",
    bullets: [
      "Verified-email enforcement: both email/password sign-up and OAuth sign-ins require a verified email before sessions are issued or accounts are linked.",
      "PKCE & signed state validation: Google and GitHub OAuth flows enforce PKCE (S256) and short-lived server-verified state cookies.",
      "Strict redirect validation: callbackURL, errorCallbackURL, and newUserCallbackURL targets are validated against configured trusted origins to block open redirects.",
      "Hardened cookies & rate limiting: sessions use encrypted HTTP-only SameSite cookies paired with per-endpoint rate limits on sign-in, sign-up, and password reset routes.",
    ],
  },
  {
    id: "encryption-secrets",
    title: "Encryption in Transit & at Rest",
    bullets: [
      "Transport security: all API, web, and Postgres database traffic runs over TLS.",
      "OAuth token encryption at rest: stored provider tokens are encrypted at rest via Better Auth XChaCha20-Poly1305 encryption before persistence.",
      "Zero secret logging: server loggers and auth error handlers automatically redact cookies, Authorization headers, OAuth authorization codes, states, and token fields.",
    ],
  },
  {
    id: "infrastructure-isolation",
    title: "Application & API Hardening",
    bullets: [
      "HTTP security headers applied globally across backend API responses via Helmet alongside strict CORS origin allowlisting.",
      "Input schemas enforced with Zod across environment configuration, authentication payloads, and frontend forms.",
      "Unique per-request correlation IDs (x-request-id) for clean troubleshooting without exposing internal stack traces in production.",
    ],
  },
  {
    id: "vulnerability-disclosure",
    title: "Responsible Vulnerability Disclosure",
    summary: "Found a security issue? Report it directly before public disclosure.",
    paragraphs: [
      "If you discover a potential security vulnerability in ReviewPilot, please send reproducible steps to security@reviewpilot.dev. Please do not access, modify, or exfiltrate data belonging to other users during testing.",
      "We acknowledge verified reports promptly and coordinate remediation before any public advisory.",
    ],
  },
];

export default function SecurityPage() {
  return (
    <LegalDocument
      activeSlug="security"
      badge="Security"
      title="Security & Data Protection"
      description="Architectural safeguards protecting your authentication sessions, encrypted OAuth credentials, API traffic, and code review telemetry."
      effectiveDate="November 11, 2026"
      highlightTitle="Defense-in-depth by default"
      highlightBody="Every authentication flow enforces verified emails, PKCE + state checks, trusted-origin redirect validation, encrypted token storage at rest, and automatic log redaction."
      sections={sections}
    />
  );
}

