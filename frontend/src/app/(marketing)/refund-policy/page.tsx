import * as React from "react";
import {
  buildLegalMetadata,
  LegalDocument,
  type LegalSection,
} from "@/src/components/legal/legal-document";

export const metadata = buildLegalMetadata(
  "Refund & Cancellation Policy",
  "ReviewPilot cancellation terms, dispute process, and 5-7 business day refund timelines for Razorpay payments."
);

const sections: LegalSection[] = [
  {
    id: "cancellation",
    title: "1. Subscription Cancellation Policy",
    summary: "Cancel anytime from your dashboard with zero lock-in or cancellation fees.",
    paragraphs: [
      "ReviewPilot offers transparent, self-serve subscription management. You can cancel your subscription at any time by navigating to Dashboard -> Billing and clicking 'Cancel subscription'.",
      "Upon cancellation, auto-renewal will be turned off immediately. You will retain full access to all Premium features, quotas, and history until the end of your currently paid billing period. After this date, your workspace automatically switches to the Free tier without data loss.",
    ],
  },
  {
    id: "refund-criteria",
    title: "2. Refund Eligibility & Criteria",
    summary: "Clear guidelines on refund requests and account credits.",
    paragraphs: [
      "Because ReviewPilot provides an ongoing, fully functional Free tier to evaluate all core static code analysis and PR scanning workflows prior to upgrade, recurring subscription fees are generally non-refundable once billed.",
      "However, we review refund requests under the following eligible circumstances:",
    ],
    bullets: [
      "Duplicate / Erroneous Billing: If your account is billed multiple times for the same subscription cycle due to a technical glitch, duplicate charges will be refunded in full.",
      "Unintended Renewal: If you intended to cancel before renewal and contact us within 48 hours of charge without initiating new scans, we will process a full refund.",
      "Annual Plan Proration: Annual subscriptions cancelled within 7 calendar days of purchase are eligible for a full refund minus any third-party gateway processing fees.",
      "Service Unavailability: If sustained, continuous downtime exceeding 72 consecutive hours prevents access to core scanning features, customers may request a prorated credit.",
    ],
  },
  {
    id: "refund-turnaround",
    title: "3. Refund Processing Timelines & Source Credit",
    summary: "Refunds are processed within 5 to 7 business days directly to the original payment method.",
    paragraphs: [
      "Once a refund request is reviewed and approved by our billing team, the refund will be initiated through our payment partner Razorpay.",
      "In strict accordance with banking standards, all refunds are credited back to the original source of payment (original Credit Card, Debit Card, NetBanking account, or UPI VPA used during checkout) within 5 to 7 business days.",
      "Please note that the exact posting date onto your account statement depends on your card-issuing bank or payment institution.",
    ],
  },
  {
    id: "how-to-request",
    title: "4. How to Request a Refund",
    paragraphs: [
      "To request a refund or raise a billing dispute, email our billing department directly at billing@reviewpilot.io with your workspace name, registered email address, and the Razorpay Payment ID (e.g., pay_xxxxxxxxxxxxxx).",
      "All requests receive written acknowledgment within 24 business hours.",
    ],
  },
];

export default function RefundPolicyPage() {
  return (
    <LegalDocument
      activeSlug="refund-policy"
      badge="Billing & Payments"
      title="Refund & Cancellation Policy"
      description="Transparent cancellation rules and standard 5 to 7 business day refund turnaround times for ReviewPilot subscriptions."
      effectiveDate="November 17, 2026"
      highlightTitle="Standard 5–7 day refund turnaround"
      highlightBody="Approved refunds are credited directly back to your original payment method (Card/UPI/NetBanking) within 5 to 7 business days via Razorpay."
      sections={sections}
    />
  );
}
