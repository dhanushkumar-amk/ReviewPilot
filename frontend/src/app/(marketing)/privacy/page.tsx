import * as React from "react";
import {
  buildLegalMetadata,
  LegalDocument,
  type LegalSection,
} from "@/src/components/legal/legal-document";

export const metadata = buildLegalMetadata(
  "Privacy Policy",
  "How ReviewPilot collects, uses, encrypts, and protects account, OAuth, and repository data."
);

const sections: LegalSection[] = [
  {
    id: "data-we-collect",
    title: "Information We Collect",
    paragraphs: [
      "ReviewPilot collects only the minimum information required to authenticate your account, protect sessions, and deliver pull request review workflows.",
    ],
    bullets: [
      "Account details: your display name, verified email address, and profile avatar URL returned by email sign-up or Google/GitHub OAuth.",
      "OAuth identifiers & encrypted tokens: provider user IDs and scoped OAuth tokens encrypted at rest when signing in with Google or GitHub.",
      "Workspace & review telemetry: connected repository settings, scan summaries, finding counts, and rule configurations you create.",
      "Operational diagnostics: API latency, request IDs, and redacted security logs (with passwords, secrets, OAuth codes, and tokens stripped).",
    ],
  },
  {
    id: "oauth-scopes",
    title: "Google & GitHub OAuth Data Usage",
    summary: "OAuth credentials are used strictly for sign-in and authorized repository workflows.",
    bullets: [
      "Google OAuth requests openid, email, and profile scopes solely to verify your identity, prevent duplicate unverified accounts, and display your name and avatar.",
      "GitHub OAuth requests read:user and user:email scopes so ReviewPilot can confirm your verified primary email and safely link your account.",
      "ReviewPilot does not sell personal data, run third-party advertising trackers, or use private customer code or OAuth data to train public foundation models.",
    ],
  },
  {
    id: "cookies-sessions",
    title: "Cookies & Session Management",
    paragraphs: [
      "ReviewPilot uses essential encrypted HTTP-only session cookies (SameSite=Lax, Secure in production) to keep you signed in securely across requests.",
      "Temporary OAuth state cookies are created during sign-in redirects to prevent CSRF and replay attacks, and expire immediately after callback verification.",
    ],
  },
  {
    id: "data-sharing",
    title: "How We Share Data",
    paragraphs: [
      "We do not sell or rent personal information. Data is shared only with vetted sub-processors necessary to run ReviewPilot (such as managed PostgreSQL hosting and transactional authentication infrastructure) or when legally required by valid court order.",
    ],
  },
  {
    id: "retention-rights",
    title: "Data Retention & Your Rights",
    paragraphs: [
      "We retain account records while your workspace remains active so your settings, findings history, and repository rules persist.",
    ],
    bullets: [
      "Revoke OAuth access at any time from your Google Account Security settings or GitHub Authorized OAuth Apps.",
      "Request access, correction, export, or deletion of your account data by emailing legal@reviewpilot.dev.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalDocument
      activeSlug="privacy"
      badge="Privacy"
      title="Privacy Policy"
      description="How ReviewPilot handles your email address, Google and GitHub OAuth profile details, HTTP-only session cookies, and workspace data."
      effectiveDate="November 11, 2026"
      highlightTitle="Minimal data & verified identity"
      highlightBody="We request only the minimal OAuth scopes needed to verify your identity and email, encrypt stored OAuth tokens at rest, and never sell your data or train public models on private repositories."
      sections={sections}
    />
  );
}

