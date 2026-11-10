import * as React from "react";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/app-shell/empty-state";
import { Button } from "@/components/ui/button";
import { ScanSearchIcon } from "lucide-react";

export default function ScansPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Scans"
        description="Historical log of automated static analysis and security vulnerability scan runs."
      />
      <EmptyState
        icon={<ScanSearchIcon className="size-4" />}
        title="No scans executed yet"
        description="Trigger an on-demand security scan or push a commit to trigger automated continuous analysis."
        action={<Button variant="default">Trigger scan</Button>}
      />
    </div>
  );
}
