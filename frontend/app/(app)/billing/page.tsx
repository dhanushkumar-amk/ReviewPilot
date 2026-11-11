"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  CreditCardIcon,
  DownloadIcon,
  ReceiptIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react";

import { PageHeader } from "@/components/app-shell/page-header";
import { StatCard } from "@/components/app-shell/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { billingInvoices } from "@/lib/dashboard-data";

export default function BillingPage() {
  const [billingEmail, setBillingEmail] = React.useState(
    "finance@reviewpilot.io"
  );
  const [taxId, setTaxId] = React.useState("US-EIN-84-2910422");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Billing"
        showTabs={false}
        description="Manage subscription tier, seat consumption, payment details, and downloadable monthly invoices."
        actions={
          <Button
            variant="outline"
            onClick={() => toast.success("Opened Stripe customer billing portal")}
          >
            <CreditCardIcon data-icon="inline-start" />
            Manage payment method
          </Button>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Current plan"
          value="Enterprise"
          description="Billed monthly · Renews Dec 01, 2026"
          badge={{ label: "Active", variant: "success" }}
        />
        <StatCard
          title="Monthly commitment"
          value="$490"
          description="$19.60 per seat across 25 included seats"
          icon={ReceiptIcon}
        />
        <StatCard
          title="Seats utilized"
          value="6 / 25"
          description="19 seats remaining before automatic prorated scaling"
          icon={SparklesIcon}
        />
      </div>

      {/* Plan Usage + Billing Contact */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Plan quotas & metering</CardTitle>
            <CardDescription>
              Real-time workspace consumption for the Nov 2026 billing cycle
            </CardDescription>
            <CardAction>
              <Badge variant="outline">Unlimited scans</Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-5">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">
                  Team member seats
                </span>
                <span className="font-mono text-muted-foreground">
                  6 / 25 used (24%)
                </span>
              </div>
              <Progress value={24} />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">
                  Connected repositories
                </span>
                <span className="font-mono text-muted-foreground">
                  6 / 50 included (12%)
                </span>
              </div>
              <Progress value={12} />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">
                  Deep AI remediation budget
                </span>
                <span className="font-mono text-muted-foreground">
                  1,680 / 2,000 patches (84%)
                </span>
              </div>
              <Progress value={84} />
            </div>

            <Separator />

            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3 text-xs">
              <div className="flex items-center gap-2">
                <CreditCardIcon className="size-4 text-muted-foreground" />
                <span className="font-medium text-foreground">
                  Visa ending in 4242
                </span>
              </div>
              <span className="font-mono text-muted-foreground">Exp 08/28</span>
            </div>
          </CardContent>
          <CardFooter className="justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheckIcon className="size-3.5 text-success" />
              SOC2 Type II & SAML SSO included
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => toast.success("Seat upgrade options opened")}
            >
              Adjust seats
            </Button>
          </CardFooter>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Invoice recipient & tax details</CardTitle>
            <CardDescription>
              Receipts and tax statements are emailed automatically on the 1st
              of each month
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="bill-email">
                  Accounts payable email
                </FieldLabel>
                <Input
                  id="bill-email"
                  type="email"
                  value={billingEmail}
                  onChange={(e) => setBillingEmail(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="bill-tax">Tax / VAT ID</FieldLabel>
                <Input
                  id="bill-tax"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                />
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="justify-end">
            <Button
              onClick={() => toast.success("Updated billing contact details")}
            >
              Save billing profile
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Invoice History */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Invoice history</CardTitle>
          <CardDescription>
            Download itemized PDF receipts for accounting and compliance audits
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Billing period</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {billingInvoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono text-xs font-medium">
                    {inv.id}
                  </TableCell>
                  <TableCell className="text-sm">{inv.period}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {inv.description}
                  </TableCell>
                  <TableCell className="font-mono text-sm font-medium">
                    {inv.amount}
                  </TableCell>
                  <TableCell>
                    <Badge variant="success">{inv.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toast.success(`Downloaded ${inv.id}.pdf`)}
                    >
                      <DownloadIcon data-icon="inline-start" />
                      PDF
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
