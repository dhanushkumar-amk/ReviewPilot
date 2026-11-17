import * as React from "react";
import {
  buildLegalMetadata,
  LegalDocument,
  type LegalSection,
} from "@/src/components/legal/legal-document";

export const metadata = buildLegalMetadata(
  "Refund & Cancellation Policy",
  "ReviewPilot cancellation and refund terms for Premium subscriptions."
);

const sections: LegalSection[] = [
  {
    id: "overview",
    title: "Subscription Cancellation",
    paragraphs: [
      "You may cancel your ReviewPilot Premium subscription at any time directly through the Billing settings page.",
      "When you cancel, auto-renewal is immediately disabled. You will retain full access to all Premium plan limits and features until the end of your current paid billing period.",
    ],
  },
  {
    id: "refunds",
    title: "Refund Eligibility",
    paragraphs: [
      "Because ReviewPilot offers a fully functional Free tier to evaluate our automated code analysis, subscriptions are generally non-refundable once billed.",
      "If you experience technical issues or accidental duplicate charges, please contact our support team within 7 days of the charge for review.",
    ],
    bullets: [
      "Monthly subscriptions: Non-refundable once the billing period has begun.",
      "Annual subscriptions: Eligible for prorated refund consideration within 14 days of initial charge if no major scans have occurred.",
      "Failed payments: You are given a 3-day grace period to update payment details before Premium access is suspended.",
    ],
  },
  {
    id: "contact",
    title: "Contacting Support",
    paragraphs: [
      "For billing questions, invoice receipts, or refund requests, please contact us via email at billing@reviewpilot.io or through our contact page.",
    ],
  },
];

export default function RefundPolicyPage() {
  return (
    <LegalDocument
      activeSlug="refund-policy"
      badge="Billing & Subscriptions"
      title="Refund & Cancellation Policy"
      description="Clear, transparent terms governing renewals, cancellations, and refunds for ReviewPilot subscriptions."
      effectiveDate="November 17, 2026"
      highlightTitle="Cancel anytime with zero penalty"
      highlightBody="Cancellations take effect at the conclusion of your active billing period. You keep Premium features until your cycle completes."
      sections={sections}
    />
  );
}
