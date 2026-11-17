import * as React from "react";
import {
  buildLegalMetadata,
  LegalDocument,
  type LegalSection,
} from "@/src/components/legal/legal-document";

export const metadata = buildLegalMetadata(
  "Terms of Service",
  "Terms governing access to ReviewPilot, Razorpay payment processing, subscription plans, and repository security analysis."
);

const sections: LegalSection[] = [
  {
    id: "entity-acceptance",
    title: "1. Acceptance of Terms & Entity Information",
    summary: "By accessing ReviewPilot, you agree to these Terms entered into with ReviewPilot Technologies Private Limited.",
    paragraphs: [
      "These Terms of Service ('Terms') constitute a legally binding agreement between you (whether individually or on behalf of an organization) and ReviewPilot Technologies Private Limited ('ReviewPilot', 'we', 'us', or 'our'), governing your access to and use of the ReviewPilot web application, APIs, and automated code review platform.",
      "By signing up, connecting a code repository, or initiating a paid subscription, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy.",
    ],
  },
  {
    id: "accounts-auth",
    title: "2. Accounts, Authentication & Security",
    paragraphs: [
      "To use ReviewPilot, you must authenticate using a verified email address or authorized OAuth providers (Google or GitHub).",
    ],
    bullets: [
      "Account Integrity: You are responsible for maintaining the confidentiality of your session credentials and ensuring that repository permissions granted to ReviewPilot are authorized.",
      "Workspace Authorization: If you subscribe on behalf of a company or engineering organization, you represent that you possess the necessary organizational authority to bind that entity.",
      "Unauthorized Access: You must notify us immediately at security@reviewpilot.io of any unauthorized use of your account or security breach.",
    ],
  },
  {
    id: "pricing-billing",
    title: "3. Plans, Pricing & Razorpay Payment Processing",
    summary: "All transactions are billed in INR and processed securely via Razorpay Payment Gateway.",
    paragraphs: [
      "ReviewPilot provides Free and Premium subscription tiers as outlined on our Pricing page and in your account Billing dashboard.",
    ],
    bullets: [
      "Currency & Taxes: All subscription fees are denominated and charged in Indian Rupees (INR). Where applicable, Goods and Services Tax (GST) is calculated and detailed on your invoice receipts.",
      "Payment Processor: Payments are processed via Razorpay Payment Gateway (Razorpay Software Private Limited). We accept Credit Cards, Debit Cards, NetBanking (all major Indian banks), UPI (Google Pay, PhonePe, Paytm, BHIM), and supported wallets.",
      "Billing Cycles & Renewals: Subscriptions are billed in advance on a recurring monthly or annual basis. Your subscription will automatically renew at the beginning of each billing cycle unless cancelled prior to renewal.",
      "Price Adjustments: We reserve the right to revise subscription fees upon 30 days prior written notice. Continued use following a price change constitutes acceptance.",
    ],
  },
  {
    id: "cancellation-refunds",
    title: "4. Cancellation & Refund Policy",
    paragraphs: [
      "You may cancel your subscription at any time via Dashboard -> Billing -> Cancel Subscription. Cancellation stops automatic renewals at the close of the current billing cycle.",
      "Refunds are governed by our Refund & Cancellation Policy. Approved refunds are credited back to the original source of payment within 5 to 7 business days via Razorpay.",
    ],
  },
  {
    id: "code-ownership",
    title: "5. Code Ownership & Proprietary Rights",
    summary: "You retain 100% intellectual property ownership of all your source code and pull requests.",
    paragraphs: [
      "ReviewPilot claims no ownership, copyright, or intellectual property rights over code snippets, repositories, or patch suggestions processed through your workspace.",
      "You grant ReviewPilot a limited, non-exclusive license solely to fetch file diffs, execute static analyzers, generate fix recommendations, and display review findings back to authorized members of your workspace.",
      "We do not use customer proprietary code or private pull request diffs to train public foundation machine learning models.",
    ],
  },
  {
    id: "acceptable-use",
    title: "6. Acceptable Use Policy",
    bullets: [
      "Only connect repositories and GitHub organizations you are explicitly authorized to administer or inspect.",
      "Do not probe, scan, or test the vulnerability of ReviewPilot infrastructure, bypass tenant isolation, or exceed plan rate limits.",
      "Do not use ReviewPilot to distribute malware, reverse-engineer proprietary algorithms, or violate applicable cyber law.",
    ],
  },
  {
    id: "limitation-liability",
    title: "7. Warranty Disclaimers & Limitation of Liability",
    paragraphs: [
      "ReviewPilot static analysis and AI remediation drafts are automated developer aids provided on an 'as is' and 'as available' basis. You remain solely responsible for reviewing, testing, and verifying code patches prior to merging.",
      "To the fullest extent permitted by applicable Indian law, ReviewPilot Technologies Private Limited shall not be liable for indirect, punitive, or consequential damages. Our cumulative liability for all claims shall not exceed the total fees paid by you to ReviewPilot during the twelve (12) months preceding the incident.",
    ],
  },
  {
    id: "governing-law",
    title: "8. Governing Law & Dispute Resolution",
    paragraphs: [
      "These Terms shall be governed by and construed in accordance with the laws of India, without regard to conflict of law principles.",
      "Any dispute, controversy, or claim arising under or relating to these Terms shall be subject to the exclusive jurisdiction of the competent courts located in Bengaluru, Karnataka, India.",
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalDocument
      activeSlug="terms"
      badge="Terms & Governance"
      title="Terms of Service"
      description="Merchant terms, Razorpay payment conditions, intellectual property ownership, and service guidelines for ReviewPilot Technologies."
      effectiveDate="November 17, 2026"
      highlightTitle="You own 100% of your code"
      highlightBody="ReviewPilot processes pull request diffs solely to deliver automated code security feedback. We never claim ownership of your software or train public models on your proprietary repositories."
      sections={sections}
    />
  );
}
