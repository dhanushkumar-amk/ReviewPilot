import * as React from "react";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/app-shell/empty-state";
import { Button } from "@/components/ui/button";
import { CreditCardIcon } from "lucide-react";

export default function BillingPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Billing"
        description="Manage subscription plan, worker concurrency limits, and team seats."
        showTabs={false}
      />
      <EmptyState
        icon={<CreditCardIcon className="size-7 text-muted-foreground" />}
        title="Enterprise plan active"
        description="Your organization is currently subscribed to ReviewPilot Enterprise with unlimited scans."
        action={<Button variant="outline">Manage payment method</Button>}
      />
    </div>
  );
}
