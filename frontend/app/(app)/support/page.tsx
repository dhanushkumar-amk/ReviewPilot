import * as React from "react";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/app-shell/empty-state";
import { Button } from "@/components/ui/button";
import { HelpCircleIcon } from "lucide-react";

export default function SupportPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Support"
        description="Get assistance from ReviewPilot engineers and view system status."
        showTabs={false}
      />
      <EmptyState
        icon={<HelpCircleIcon className="size-7 text-muted-foreground" />}
        title="Support & Community"
        description="Need assistance diagnosing false positives or configuring your deployment? Our team is available 24/7."
        action={<Button variant="outline">Contact support</Button>}
      />
    </div>
  );
}
