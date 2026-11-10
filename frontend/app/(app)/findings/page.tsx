import * as React from "react";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/app-shell/empty-state";
import { Button } from "@/components/ui/button";
import { ShieldCheckIcon } from "lucide-react";

export default function FindingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Findings"
        description="Comprehensive inventory of triaged and outstanding review diagnostics."
      />
      <EmptyState
        icon={<ShieldCheckIcon className="size-7" />}
        iconClassName="bg-success/10 border-success/20 text-success"
        title="No active findings"
        description="All reported rule violations and security concerns have been addressed across connected branches."
        action={<Button variant="default">Run verification</Button>}
      />
    </div>
  );
}
