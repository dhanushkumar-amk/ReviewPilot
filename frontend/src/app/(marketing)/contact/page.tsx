import * as React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowLeftIcon,
  ClockIcon,
  CreditCardIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "Contact Us & Business Details — ReviewPilot",
  description:
    "Official merchant contact details, support lines, grievance officer, and corporate address for ReviewPilot Technologies.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-12 sm:px-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/" />}
          className="mb-4 -ml-2 text-muted-foreground"
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Back to Home
        </Button>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Merchant Contact & Support</Badge>
          <Badge variant="secondary">Razorpay Verified Merchant</Badge>
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Contact Us
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          ReviewPilot Technologies is dedicated to transparent customer support, billing inquiries, and prompt grievance resolution.
        </p>
      </div>

      <Separator />

      {/* Primary Support & Office Details */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Operating Entity & Address */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-primary">
              <MapPinIcon className="size-5 shrink-0" />
              <CardTitle>Registered & Corporate Office</CardTitle>
            </div>
            <CardDescription>
              Legal entity and physical operations headquarters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-foreground">
            <p className="font-semibold text-base">ReviewPilot Technologies Private Limited</p>
            <p className="text-muted-foreground leading-relaxed">
              Tower B, 3rd Floor, Green Glen Layout,<br />
              Outer Ring Road, Bellandur,<br />
              Bengaluru, Karnataka 560103, India
            </p>
            <div className="pt-2 text-xs text-muted-foreground">
              CIN: <span className="font-mono">U72900KA2026PTC184920</span>
            </div>
          </CardContent>
        </Card>

        {/* Operating Hours & Direct Phone */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-primary">
              <PhoneIcon className="size-5 shrink-0" />
              <CardTitle>Customer Care & Hours</CardTitle>
            </div>
            <CardDescription>
              Direct phone assistance and operating schedules
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Telephone Support:</p>
              <a
                href="tel:+918047182000"
                className="font-mono text-base font-semibold text-primary hover:underline"
              >
                +91 80 4718 2000
              </a>
            </div>
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <ClockIcon className="size-4 shrink-0 mt-0.5 text-primary" />
              <span>
                <strong>Business Hours:</strong> Monday to Friday, 9:00 AM – 6:00 PM IST (Excluding Gazetted National Holidays).
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Standard turnaround time for email queries is within <strong>24 business hours</strong>.
            </p>
          </CardContent>
        </Card>

        {/* Support & Billing Emails */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-primary">
              <MailIcon className="size-5 shrink-0" />
              <CardTitle>Customer Support & Billing</CardTitle>
            </div>
            <CardDescription>
              Technical troubleshooting, subscription renewals, and invoice inquiries
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Technical & Product Support:</p>
              <a
                href="mailto:support@reviewpilot.io"
                className="font-mono font-medium text-primary hover:underline"
              >
                support@reviewpilot.io
              </a>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Billing, Receipts & Refunds:</p>
              <a
                href="mailto:billing@reviewpilot.io"
                className="font-mono font-medium text-primary hover:underline"
              >
                billing@reviewpilot.io
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Grievance Redressal Officer */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-primary">
              <ShieldAlertIcon className="size-5 shrink-0" />
              <CardTitle>Grievance Redressal Officer</CardTitle>
            </div>
            <CardDescription>
              In accordance with Information Technology Act, 2000 & Rules
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-foreground">
            <p className="font-medium">Nodal Grievance Officer</p>
            <p className="text-muted-foreground">
              Name: <strong>Kavita Sundaram</strong><br />
              Designation: Head of Trust & Safety<br />
              Email:{" "}
              <a
                href="mailto:grievance@reviewpilot.io"
                className="font-mono text-primary hover:underline"
              >
                grievance@reviewpilot.io
              </a>
            </p>
            <p className="text-xs text-muted-foreground pt-1">
              Complaints are acknowledged within 24 hours and resolved within 15 working days.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Acceptance & Security Criteria */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-primary">
            <CreditCardIcon className="size-5 shrink-0" />
            <CardTitle>Payment Acceptance & Payment Gateway</CardTitle>
          </div>
          <CardDescription>
            Secure online payment processing powered by Razorpay
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground leading-relaxed">
            All online transactions on ReviewPilot are processed through <strong>Razorpay Payment Gateway</strong> (Razorpay Software Private Limited), an RBI-authorized Payment Aggregator complying with the highest PCI-DSS Level 1 security standard.
          </p>

          <div className="rounded-lg border border-border bg-muted/40 p-4">
            <p className="font-semibold text-xs text-foreground uppercase tracking-wider mb-2">
              Accepted Payment Modes
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">Credit Cards (Visa, MasterCard, RuPay, Amex)</Badge>
              <Badge variant="outline">Debit Cards (All Major Indian Banks)</Badge>
              <Badge variant="outline">UPI (Google Pay, PhonePe, Paytm, BHIM, Cred)</Badge>
              <Badge variant="outline">Net Banking (50+ Indian Banks)</Badge>
              <Badge variant="outline">Corporate & Commercial Cards</Badge>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheckIcon className="size-4 text-success shrink-0" />
            <span>
              256-bit TLS encryption. ReviewPilot does not store card numbers, CVVs, or NetBanking passwords.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
