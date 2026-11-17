import * as React from "react";
import {
  buildLegalMetadata,
  LegalDocument,
  type LegalSection,
} from "@/src/components/legal/legal-document";

export const metadata = buildLegalMetadata(
  "Shipping & Service Delivery Policy",
  "Digital fulfillment and instant SaaS access delivery policy for ReviewPilot."
);

const sections: LegalSection[] = [
  {
    id: "digital-service",
    title: "1. Digital Delivery Only (Software as a Service)",
    summary: "ReviewPilot is a 100% digital cloud-based SaaS platform. No physical goods are shipped.",
    paragraphs: [
      "ReviewPilot provides an automated code review, static analysis, and security remediation platform hosted in the cloud. As a pure Software-as-a-Service (SaaS) provider, there are no physical products, packages, or hardware items dispatched.",
      "All services and subscription entitlements are delivered digitally and electronically via our web application at https://reviewpilot.io.",
    ],
  },
  {
    id: "timeline",
    title: "2. Delivery Timelines & Access Activation",
    summary: "Access to paid features is instantaneous upon payment confirmation.",
    paragraphs: [
      "Upon successful completion of payment through our payment partner Razorpay, your ReviewPilot subscription tier is activated instantaneously (within 0 to 60 seconds).",
      "Your workspace repository limits, monthly scan allowances, and extended history views are upgraded automatically. You do not need to wait for manual provisioning or shipping windows.",
    ],
    bullets: [
      "Instant Provisioning: Your workspace status updates to 'Active' immediately upon transaction success.",
      "Access Credentials: No separate tracking numbers are issued. Access is tied to your verified login credentials (email or Google/GitHub OAuth).",
      "Invoices & Receipts: A digital receipt containing your transaction reference, GST details, and plan breakdown is available instantly in your Billing dashboard and sent to your billing email.",
    ],
  },
  {
    id: "delivery-issues",
    title: "3. Delivery Issues & Non-Receipt of Digital Access",
    paragraphs: [
      "If your account reflects a successful payment deduction on your bank statement but your workspace does not reflect Premium access within 10 minutes, please:",
    ],
    bullets: [
      "Click the 'Sync status' button on your Billing dashboard (https://reviewpilot.io/billing) to trigger an immediate status re-fetch from Razorpay.",
      "Contact customer support at support@reviewpilot.io or billing@reviewpilot.io with your Razorpay Payment ID.",
      "Our technical team will manually verify the payment reference with Razorpay and activate your workspace entitlements within 2 hours.",
    ],
  },
];

export default function DeliveryPolicyPage() {
  return (
    <LegalDocument
      activeSlug="delivery-policy"
      badge="Fulfillment & Access"
      title="Shipping & Service Delivery Policy"
      description="ReviewPilot is an automated cloud software service. Learn about our instantaneous digital delivery and account provisioning."
      effectiveDate="November 17, 2026"
      highlightTitle="Instant digital delivery"
      highlightBody="No physical shipping required. Paid plan limits and features are provisioned automatically within seconds of payment confirmation."
      sections={sections}
    />
  );
}
