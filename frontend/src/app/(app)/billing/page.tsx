"use client";

import * as React from "react";
import Script from "next/script";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  AlertCircleIcon,
  CheckIcon,
  CopyIcon,
  CreditCardIcon,
  FolderCodeIcon,
  RefreshCwIcon,
  ScanLineIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";

import { PageHeader } from "@/components/app-shell/page-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useBilling,
  useCancelSubscription,
  useConfirmSubscription,
  useSubscribe,
  useSyncBilling,
  type PlanDisplayInfo,
} from "@/src/features/billing/use-billing";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

function formatPaiseToInr(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

function getComputedPrimaryColor(): string {
  if (typeof window === "undefined") return "#0f172a";
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
  if (!raw) return "#0f172a";
  if (raw.startsWith("#") || raw.startsWith("rgb")) return raw;
  return `hsl(${raw})`;
}

export default function BillingPage() {
  const { data: billing, isLoading, isError, refetch } = useBilling();
  const subscribeMutation = useSubscribe();
  const confirmMutation = useConfirmSubscription();
  const cancelMutation = useCancelSubscription();
  const syncMutation = useSyncBilling();

  const [billingCycle, setBillingCycle] = React.useState<"PREMIUM_MONTHLY" | "PREMIUM_YEARLY">(
    "PREMIUM_MONTHLY"
  );
  const [showCancelDialog, setShowCancelDialog] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [isPolling, setIsPolling] = React.useState(false);

  // Poll for activation after payment confirmation
  React.useEffect(() => {
    if (!isPolling) return;
    const interval = setInterval(async () => {
      const res = await refetch();
      if (res.data?.entitlements.plan === "PREMIUM" && res.data?.subscription?.status === "ACTIVE") {
        setIsPolling(false);
        toast.success("Subscription is now active! Welcome to Premium.");
      }
    }, 2000);

    const timeout = setTimeout(() => {
      setIsPolling(false);
    }, 30_000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isPolling, refetch]);

  const handleCopyPaymentId = (id: string) => {
    navigator.clipboard?.writeText(id).then(() => {
      setCopiedId(id);
      toast.success("Payment reference copied to clipboard");
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleUpgrade = async (planKey: "PREMIUM_MONTHLY" | "PREMIUM_YEARLY") => {
    if (!window.Razorpay) {
      toast.error("Payment gateway is still loading. Please wait a second and try again.");
      return;
    }

    try {
      const order = await subscribeMutation.mutateAsync({ planKey });

      const options = {
        key: order.keyId,
        subscription_id: order.subscriptionId,
        name: "ReviewPilot",
        description:
          order.planKey === "PREMIUM_MONTHLY"
            ? "ReviewPilot Premium (Monthly)"
            : "ReviewPilot Premium (Yearly)",
        theme: {
          color: getComputedPrimaryColor(),
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_subscription_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await confirmMutation.mutateAsync(response);
            setIsPolling(true);
            toast.success("Payment received! Activating your subscription...");
          } catch (err: any) {
            toast.error(err.message || "Failed to confirm payment signature.");
          }
        },
        modal: {
          ondismiss: () => {
            toast.info("Payment window closed.");
          },
        },
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.open();
    } catch (err: any) {
      toast.error(err.message || "Failed to initiate subscription.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Billing & Subscription"
          description="Manage workspace plan tiers, monthly usage limits, and payment receipts."
          showTabs={false}
        />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (isError || !billing) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Billing & Subscription"
          description="Manage workspace plan tiers, monthly usage limits, and payment receipts."
          showTabs={false}
        />
        <Alert variant="destructive">
          <AlertCircleIcon className="size-4" />
          <AlertTitle>Billing Unavailable</AlertTitle>
          <AlertDescription>
            Could not load workspace billing and entitlement details. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { entitlements, subscription, payments, canManage, plans } = billing;
  const isPremium = entitlements.plan === "PREMIUM";
  const { usage, limits } = entitlements;

  const repoPct = Math.min(100, Math.round((usage.connectedRepositories / limits.maxRepositories) * 100));
  const scanPct = Math.min(100, Math.round((usage.scansThisMonth / limits.maxScansPerMonth) * 100));
  const aiPct = Math.min(100, Math.round((usage.aiFixDraftsThisMonth / limits.maxAiFixDraftsPerMonth) * 100));

  return (
    <div className="flex flex-col gap-6">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />

      <PageHeader
        title="Billing & Subscription"
        description="Manage workspace plan tiers, monthly usage limits, and payment receipts."
        showTabs={false}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
            >
              <RefreshCwIcon
                className={syncMutation.isPending ? "size-3.5 animate-spin" : "size-3.5"}
                data-icon="inline-start"
              />
              Sync status
            </Button>
          </div>
        }
      />

      {/* Top Section: Current Plan Overview & Usage Meters */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Current Plan Card */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Current Plan
              </span>
              <Badge variant={isPremium ? "default" : "secondary"}>
                {isPremium ? "Premium" : "Free"}
              </Badge>
            </div>
            <CardTitle className="text-2xl font-bold">
              {isPremium ? "ReviewPilot Premium" : "ReviewPilot Free"}
            </CardTitle>
            <CardDescription>
              {isPremium
                ? "Full-featured automated code review with higher limits and extended history."
                : "Basic code review for individual developers and small repositories."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            {subscription ? (
              <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {subscription.status}
                  </Badge>
                </div>
                {subscription.graceUntil && (
                  <div className="text-warning-foreground font-medium">
                    Payment pending: Grace period active until{" "}
                    {format(new Date(subscription.graceUntil), "MMM d, yyyy")}
                  </div>
                )}
                {subscription.currentPeriodEnd && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {subscription.cancelAtPeriodEnd ? "Access ends" : "Renews"}
                    </span>
                    <span className="font-medium text-foreground">
                      {format(new Date(subscription.currentPeriodEnd), "MMM d, yyyy")}
                    </span>
                  </div>
                )}
                {subscription.cancelAtPeriodEnd && (
                  <p className="text-muted-foreground">
                    Subscription scheduled to cancel at end of billing cycle.
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                You are currently on the Free tier. Upgrade to unlock 10 repositories, 1,000 scans per month, and 90-day retention.
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="size-4 text-primary shrink-0" />
                <span>{limits.historyDays}-day scan & finding history</span>
              </div>
              <div className="flex items-center gap-2">
                <UsersIcon className="size-4 text-primary shrink-0" />
                <span>Up to {limits.maxMembers} team {limits.maxMembers === 1 ? "member" : "members"}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t pt-4">
            {isPremium && canManage && !subscription?.cancelAtPeriodEnd && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-destructive hover:text-destructive"
                onClick={() => setShowCancelDialog(true)}
              >
                Cancel subscription
              </Button>
            )}
            {!isPremium && canManage && (
              <Button
                size="sm"
                className="w-full"
                onClick={() => handleUpgrade(billingCycle)}
                disabled={subscribeMutation.isPending}
              >
                <SparklesIcon data-icon="inline-start" />
                {subscribeMutation.isPending ? "Opening checkout..." : "Upgrade to Premium"}
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* Usage Quotas Card */}
        <Card className="flex flex-col lg:col-span-2">
          <CardHeader>
            <CardTitle>Plan Quotas & Resource Usage</CardTitle>
            <CardDescription>
              Usage resets at the start of each UTC calendar month.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-6">
            {/* Meter 1: Repositories */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  <FolderCodeIcon className="size-3.5 text-muted-foreground" />
                  Connected Repositories
                </span>
                <span className="font-mono text-muted-foreground">
                  {usage.connectedRepositories} / {limits.maxRepositories} used ({repoPct}%)
                </span>
              </div>
              <Progress value={repoPct} />
              {repoPct >= 100 ? (
                <p className="text-xs text-destructive font-medium">
                  Repository limit reached. New repositories cannot be connected until upgraded or disconnected.
                </p>
              ) : repoPct >= 80 ? (
                <p className="text-xs text-warning-foreground font-medium">
                  Approaching repository limit for your plan.
                </p>
              ) : null}
            </div>

            {/* Meter 2: Monthly Scans */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  <ScanLineIcon className="size-3.5 text-muted-foreground" />
                  Monthly Scans
                </span>
                <span className="font-mono text-muted-foreground">
                  {usage.scansThisMonth} / {limits.maxScansPerMonth} used ({scanPct}%)
                </span>
              </div>
              <Progress value={scanPct} />
              {scanPct >= 100 ? (
                <p className="text-xs text-destructive font-medium">
                  Monthly scan limit reached. Automatic and manual scans are paused until next month or upgrade.
                </p>
              ) : scanPct >= 80 ? (
                <p className="text-xs text-warning-foreground font-medium">
                  Nearing your monthly scan limit ({usage.scansThisMonth} scans run).
                </p>
              ) : null}
            </div>

            {/* Meter 3: AI Fix Drafts */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  <SparklesIcon className="size-3.5 text-muted-foreground" />
                  Monthly AI Fix Drafts
                </span>
                <span className="font-mono text-muted-foreground">
                  {usage.aiFixDraftsThisMonth} / {limits.maxAiFixDraftsPerMonth} used ({aiPct}%)
                </span>
              </div>
              <Progress value={aiPct} />
              {aiPct >= 100 ? (
                <p className="text-xs text-destructive font-medium">
                  Monthly AI remediation limit reached.
                </p>
              ) : aiPct >= 80 ? (
                <p className="text-xs text-warning-foreground font-medium">
                  Approaching monthly AI draft limit.
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plan Comparison Section */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Available Plans</CardTitle>
              <CardDescription>
                Choose the billing frequency that best fits your workflow.
              </CardDescription>
            </div>
            <Tabs
              value={billingCycle}
              onValueChange={(val) => setBillingCycle(val as "PREMIUM_MONTHLY" | "PREMIUM_YEARLY")}
            >
              <TabsList>
                <TabsTrigger value="PREMIUM_MONTHLY">Monthly billing</TabsTrigger>
                <TabsTrigger value="PREMIUM_YEARLY">
                  Annual billing (Save 16%)
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 pt-6 md:grid-cols-2">
          {/* Free Tier Card */}
          <div className="flex flex-col justify-between rounded-xl border border-border p-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-foreground">Free</span>
                {!isPremium && (
                  <Badge variant="outline">Current plan</Badge>
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-foreground">₹0</span>
                <span className="text-xs text-muted-foreground">/ month</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Essential automated code security analysis for personal projects.
              </p>
              <Separator />
              <ul className="flex flex-col gap-2.5 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckIcon className="size-4 text-primary shrink-0" />
                  <span>1 connected repository</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="size-4 text-primary shrink-0" />
                  <span>30 automated scans per month</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="size-4 text-primary shrink-0" />
                  <span>3 AI fix proposals per month</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="size-4 text-primary shrink-0" />
                  <span>7-day scan history</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="size-4 text-primary shrink-0" />
                  <span>1 workspace member</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Premium Tier Card */}
          <div className="relative flex flex-col justify-between rounded-xl border-2 border-primary bg-primary/5 p-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-foreground">Premium</span>
                {isPremium ? (
                  <Badge variant="default">Current plan</Badge>
                ) : (
                  <Badge variant="outline" className="border-primary text-primary">
                    Recommended
                  </Badge>
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-foreground">
                  {billingCycle === "PREMIUM_MONTHLY" ? "₹799" : "₹7,999"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {billingCycle === "PREMIUM_MONTHLY" ? "/ month" : "/ year"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Comprehensive security enforcement and AI remediation for teams.
              </p>
              <Separator />
              <ul className="flex flex-col gap-2.5 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckIcon className="size-4 text-primary shrink-0" />
                  <span className="font-medium text-foreground">10 connected repositories</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="size-4 text-primary shrink-0" />
                  <span className="font-medium text-foreground">1,000 automated scans per month</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="size-4 text-primary shrink-0" />
                  <span className="font-medium text-foreground">50 AI fix proposals per month</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="size-4 text-primary shrink-0" />
                  <span>90-day extended scan & finding history</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="size-4 text-primary shrink-0" />
                  <span>Up to 5 workspace members</span>
                </li>
              </ul>
            </div>

            <div className="pt-6">
              {!isPremium ? (
                canManage ? (
                  <Button
                    className="w-full"
                    onClick={() => handleUpgrade(billingCycle)}
                    disabled={subscribeMutation.isPending || isPolling}
                  >
                    {subscribeMutation.isPending || isPolling ? (
                      <span className="flex items-center gap-2">
                        <Spinner className="size-3.5" />
                        Processing...
                      </span>
                    ) : (
                      `Subscribe (${billingCycle === "PREMIUM_MONTHLY" ? "₹799/mo" : "₹7,999/yr"})`
                    )}
                  </Button>
                ) : (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Button disabled className="w-full">
                            Upgrade to Premium
                          </Button>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        Only workspace owners can subscribe or change billing plans.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )
              ) : (
                <div className="flex items-center justify-center rounded-lg border border-border bg-background py-2 text-xs font-medium text-muted-foreground">
                  Active Subscription
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment History Table */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Payment History</CardTitle>
          <CardDescription>
            Audit log of subscription charges processed via Razorpay.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="h-11">
                <TableHead>Payment Reference</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow className="h-24">
                  <TableCell colSpan={4} className="text-center text-xs text-muted-foreground">
                    No payment transactions recorded for this workspace.
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((p) => (
                  <TableRow key={p.id} className="h-12">
                    <TableCell>
                      <div className="flex items-center gap-1.5 font-mono text-xs">
                        <span>{p.reference}</span>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleCopyPaymentId(p.reference)}
                          aria-label="Copy payment ID"
                        >
                          {copiedId === p.reference ? (
                            <CheckIcon className="size-3 text-primary" />
                          ) : (
                            <CopyIcon className="size-3 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold text-foreground">
                      {formatPaiseToInr(p.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={p.status === "CAPTURED" ? "default" : "destructive"}
                        className="text-[10px] uppercase font-mono"
                      >
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {p.paidAt
                        ? format(new Date(p.paidAt), "MMM d, yyyy, h:mm a")
                        : format(new Date(p.createdAt), "MMM d, yyyy, h:mm a")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cancellation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Premium Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Your subscription will remain active until the end of your current billing period (
              {subscription?.currentPeriodEnd
                ? format(new Date(subscription.currentPeriodEnd), "MMMM d, yyyy")
                : "the end of the cycle"}
              ). After that date, your workspace will revert to the Free tier limits (1 repository, 30 scans/month, 7-day history).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelMutation.isPending}>
              Keep Subscription
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={cancelMutation.isPending}
              onClick={async () => {
                await cancelMutation.mutateAsync();
                setShowCancelDialog(false);
              }}
            >
              {cancelMutation.isPending ? "Cancelling..." : "Confirm Cancellation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
