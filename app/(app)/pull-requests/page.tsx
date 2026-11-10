import * as React from "react";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/app-shell/empty-state";
import { Button } from "@/components/ui/button";
import { GitPullRequestIcon } from "lucide-react";

export default function PullRequestsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pull requests"
        description="Active code reviews, inline comments, and automated review approvals."
      />
      <EmptyState
        icon={<GitPullRequestIcon className="size-4" />}
        title="No pull requests pending"
        description="Open a new pull request on any monitored branch to view automated line-by-line review comments."
        action={<Button variant="default">View integration guide</Button>}
      />
    </div>
  );
}

