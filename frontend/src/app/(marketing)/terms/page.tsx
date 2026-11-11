import * as React from "react";
import {
  buildLegalMetadata,
  LegalDocument,
  type LegalSection,
} from "@/src/components/legal/legal-document";

export const metadata = buildLegalMetadata(
  "Terms of Service",
  "Terms governing access to and use of the ReviewPilot code review platform."
);

const sections: LegalSection[] = [
  {
    id: "acceptance",
    title: "Acceptance of Terms",
    paragraphs: [
      "By creating a ReviewPilot account, connecting a repository, or accessing our web application and APIs, you agree to be bound by these Terms of Service and our Privacy Policy.",
      "If you are using ReviewPilot on behalf of a company or engineering team, you confirm that you have authority to bind that organization to these terms.",
    ],
  },
  {
    id: "accounts-auth",
    title: "Accounts, Authentication & Eligibility",
    paragraphs: [
      "You must maintain a verified email address to sign in using email/password or OAuth providers (Google and GitHub). Account linking across providers is permitted only when emails are verified.",
    ],
    bullets: [
      "Keep your credentials and OAuth sessions confidential and notify us immediately of unauthorized use.",
      "Do not share single-user credentials across unrelated accounts or bypass rate limits.",
      "You are responsible for repository permissions granted under your workspace.",
    ],
  },
  {
    id: "code-ownership",
    title: "Your Code & Intellectual Property",
    summary: "You retain 100% ownership of your repositories, diffs, and patches.",
    paragraphs: [
      "ReviewPilot claims no ownership over source code, pull request diffs, comments, or configuration rules submitted to the service.",
      "You grant ReviewPilot a limited, temporary license solely to analyze pull requests, run configured checks, and display review findings back to your authorized workspace.",
    ],
  },
  {
    id: "ai-review-disclaimer",
    title: "Automated Code Review Output",
    paragraphs: [
      "ReviewPilot provides automated static analysis, telemetry, and review suggestions to assist software engineers. Automated findings and suggested patches may occasionally contain false positives or incomplete remediation steps.",
      "You remain solely responsible for reviewing, testing, approving, and merging changes into your production codebases.",
    ],
  },
  {
    id: "acceptable-use",
    title: "Acceptable Use",
    bullets: [
      "Only connect repositories and OAuth accounts you are authorized to access and scan.",
      "Do not probe infrastructure, attempt credential stuffing, bypass access controls, or disrupt multi-tenant availability.",
      "Do not use ReviewPilot to scan or distribute malicious software in violation of applicable law.",
    ],
  },
  {
    id: "availability-liability",
    title: "Service Availability & Limitation of Liability",
    paragraphs: [
      "We strive for high availability across our API and background workers, though temporary maintenance windows or upstream provider outages may occur. Current service state is visible on our Status page.",
      "To the maximum extent permitted by law, ReviewPilot is provided on an \"as is\" and \"as available\" basis, and our aggregate liability for any claim arising out of the service is limited to fees paid by you in the twelve months preceding the claim.",
    ],
  },
  {
    id: "termination-updates",
    title: "Termination & Updates to Terms",
    paragraphs: [
      "You may stop using ReviewPilot and disconnect your OAuth integrations at any time. We may suspend accounts that violate acceptable use or pose security risks.",
      "If we update these Terms materially, we will revise the effective date above and surface notice in the application before changes take effect.",
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalDocument
      activeSlug="terms"
      badge="Legal"
      title="Terms of Service"
      description="Clear rules on repository ownership, automated pull request reviews, authentication requirements, and responsible platform usage."
      effectiveDate="November 11, 2026"
      highlightTitle="You own your code"
      highlightBody="ReviewPilot processes pull request metadata only to deliver code reviews to your team. We never claim ownership of your repositories or publish your proprietary code."
      sections={sections}
    />
  );
}

