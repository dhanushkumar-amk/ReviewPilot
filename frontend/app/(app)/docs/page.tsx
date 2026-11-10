import * as React from "react";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/app-shell/empty-state";
import { Button } from "@/components/ui/button";
import { BookOpenIcon } from "lucide-react";

export default function DocsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Documentation"
        description="Guides, API references, and architecture patterns for ReviewPilot."
        showTabs={false}
      />
      <EmptyState
        icon={<BookOpenIcon className="size-7 text-muted-foreground" />}
        title="ReviewPilot documentation"
        description="Learn how to configure webhook scanners, triage rule violations, and write custom AST lint rules."
        action={<Button variant="outline">Open API reference</Button>}
      />
    </div>
  );
}
