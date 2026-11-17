import * as React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeftIcon, MailIcon, MessageSquareIcon, ShieldCheckIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "Contact Us — ReviewPilot",
  description: "Get in touch with the ReviewPilot support, security, and billing teams.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-12 sm:px-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2 text-muted-foreground">
          <Link href="/">
            <ArrowLeftIcon data-icon="inline-start" />
            Back to Home
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Support & Contact</Badge>
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Get in Touch with ReviewPilot
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          Have questions about our code analysis, custom enterprise deployments, or billing? We are here to help.
        </p>
      </div>

      <Separator />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-primary">
              <MailIcon className="size-5" />
              <CardTitle>Customer & Technical Support</CardTitle>
            </div>
            <CardDescription>
              For technical inquiries, bug reports, and assistance setting up GitHub integrations.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="text-muted-foreground">Email us at:</p>
            <a
              href="mailto:support@reviewpilot.io"
              className="mt-1 font-mono font-medium text-primary hover:underline"
            >
              support@reviewpilot.io
            </a>
            <p className="mt-4 text-xs text-muted-foreground">
              Response time: Within 1 business day for all plans.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-primary">
              <MessageSquareIcon className="size-5" />
              <CardTitle>Billing & Inquiries</CardTitle>
            </div>
            <CardDescription>
              Questions about invoices, subscription tiers, GST details, or refunds.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="text-muted-foreground">Email us at:</p>
            <a
              href="mailto:billing@reviewpilot.io"
              className="mt-1 font-mono font-medium text-primary hover:underline"
            >
              billing@reviewpilot.io
            </a>
            <p className="mt-4 text-xs text-muted-foreground">
              Razorpay Test & Production support available Monday–Friday.
            </p>
          </CardContent>
        </Card>

        <Card className="sm:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheckIcon className="size-5" />
              <CardTitle>Security & Vulnerability Reporting</CardTitle>
            </div>
            <CardDescription>
              Responsible disclosure program for security researchers and vulnerability reports.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="text-muted-foreground">
              If you discover a security vulnerability in ReviewPilot, please report it to our security team directly:
            </p>
            <a
              href="mailto:security@reviewpilot.io"
              className="mt-1 inline-block font-mono font-medium text-primary hover:underline"
            >
              security@reviewpilot.io
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
