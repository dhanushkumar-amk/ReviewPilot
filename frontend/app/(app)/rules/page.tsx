import * as React from "react";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/app-shell/empty-state";
import { Button } from "@/components/ui/button";
import { SlidersIcon } from "lucide-react";

export default function RulesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Rules"
        description="Configure automated rule suites, CWE mappings, and custom regex policies."
        actions={
          <Button variant="default">Add custom rule</Button>
        }
      />
      <EmptyState
        icon={<SlidersIcon className="size-7 text-muted-foreground" />}
        title="Standard security rules active"
        description="All 42 default OWASP Top 10 and CWE detection heuristics are enabled across connected projects."
        action={<Button variant="outline">Browse rule catalog</Button>}
      />
    </div>
  );
}
