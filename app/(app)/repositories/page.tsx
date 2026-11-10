import * as React from "react";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/app-shell/empty-state";
import { Button } from "@/components/ui/button";
import { FolderGit2Icon } from "lucide-react";

export default function RepositoriesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Repositories"
        description="Manage connected Git source control repositories and scanning webhooks."
      />
      <EmptyState
        icon={<FolderGit2Icon className="size-4" />}
        title="No repositories connected"
        description="Connect your GitHub, GitLab, or Bitbucket organization to enable automated pull request scanning."
        action={<Button variant="default">Connect GitHub</Button>}
      />
    </div>
  );
}
