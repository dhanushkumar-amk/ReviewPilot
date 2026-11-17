import * as React from "react";
import {
  buildLegalMetadata,
  LegalDocument,
  type LegalSection,
} from "@/src/components/legal/legal-document";

export const metadata = buildLegalMetadata(
  "Privacy Policy",
  "How ReviewPilot collects, uses, encrypts, and protects account, payment, and repository data in compliance with Indian IT Rules."
);

const sections: LegalSection[] = [
  {
    id: "data-we-collect",
    title: "1. Information We Collect",
    paragraphs: [
      "ReviewPilot Technologies Private Limited collects only the minimum personal data required to authenticate your identity, process payments securely, and deliver pull request code reviews.",
    ],
    bullets: [
      "Account & Profile Information: Your name, email address, and profile picture provided during registration or fetched via Google / GitHub OAuth.",
      "Repository & Review Telemetry: Connected GitHub repository IDs, scan timestamps, rule configurations, and finding counts.",
      "Session & Diagnostic Data: Encrypted HTTP-only cookies, IP address, request IDs, and security event logs (with all tokens and credentials permanently redacted).",
    ],
  },
  {
    id: "payment-gateway",
    title: "2. Payment Processing via Razorpay",
    summary: "Payment credentials are processed directly by Razorpay under strict PCI-DSS Level 1 standards.",
    paragraphs: [
      "We utilize Razorpay Payment Gateway (Razorpay Software Private Limited) for all payment processing and subscription billing.",
      "When you upgrade to a paid plan, your payment information (such as Credit/Debit card numbers, NetBanking logins, UPI IDs, or CVVs) is captured directly by Razorpay's encrypted checkout interface. ReviewPilot does not capture, process, or store your credit/debit card numbers or sensitive banking passwords.",
      "Razorpay is an RBI-authorized Payment Aggregator that complies with the Payment Card Industry Data Security Standard (PCI-DSS Level 1). ReviewPilot receives and retains only masked card identifiers (e.g., card brand and last 4 digits), transaction reference IDs, and payment statuses for invoice accounting.",
    ],
  },
  {
    id: "oauth-and-code",
    title: "3. GitHub & Google OAuth Permissions & Code Privacy",
    summary: "OAuth tokens are encrypted at rest; we never sell data or train public AI models on your private code.",
    bullets: [
      "Minimal Scopes: We request only essential GitHub permissions to discover repositories you authorize and deliver review comments on pull requests.",
      "Token Encryption: OAuth and installation tokens are encrypted using AES-256-GCM before database storage.",
      "No Public AI Training: Customer source code and review findings are strictly isolated to your tenant workspace and never used to train public machine learning models.",
    ],
  },
  {
    id: "cookies-sessions",
    title: "4. Cookies & Tracking Technologies",
    paragraphs: [
      "ReviewPilot uses essential encrypted session cookies (SameSite=Lax, Secure in production) to maintain your login session across requests.",
      "We do not use third-party advertising tracking cookies or sell your browsing behavioral data to data brokers.",
    ],
  },
  {
    id: "data-retention-rights",
    title: "5. Data Retention & User Rights",
    paragraphs: [
      "You have full ownership and rights over your personal data under the Digital Personal Data Protection Act (DPDPA) and Information Technology Rules:",
    ],
    bullets: [
      "Right to Access & Rectify: You can review and update your profile details directly from the Account settings.",
      "Right to Erasure: You may request complete deletion of your account and associated workspace telemetry by emailing privacy@reviewpilot.io.",
      "Disconnection: You may disconnect repositories and revoke GitHub App permissions at any time from your GitHub settings.",
    ],
  },
  {
    id: "grievance-officer",
    title: "6. Grievance Officer & Contact Information",
    paragraphs: [
      "In accordance with the Information Technology Act, 2000 and rules made thereunder, the contact details of our Nodal Grievance Redressal Officer are as follows:",
      "Name: Kavita Sundaram\nDesignation: Head of Trust & Safety\nReviewPilot Technologies Private Limited\nAddress: Tower B, 3rd Floor, Outer Ring Road, Bellandur, Bengaluru, Karnataka 560103, India\nEmail: grievance@reviewpilot.io | support@reviewpilot.io\nPhone: +91 80 4718 2000",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalDocument
      activeSlug="privacy"
      badge="Privacy & Security"
      title="Privacy Policy"
      description="Detailed disclosures regarding account data, Razorpay payment processing, OAuth security, and data protection practices."
      effectiveDate="November 17, 2026"
      highlightTitle="Zero storage of payment card data"
      highlightBody="All payment transactions are handled directly by Razorpay under RBI guidelines and PCI-DSS Level 1 compliance. ReviewPilot never touches or stores your card details."
      sections={sections}
    />
  );
}
