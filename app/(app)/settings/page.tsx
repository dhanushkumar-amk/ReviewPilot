import * as React from "react";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/app-shell/empty-state";
import { Button } from "@/components/ui/button";
import { SettingsIcon } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Configure workspace policies, rule presets, and team notification integrations."
      />
      <EmptyState
        icon={<SettingsIcon className="size-4" />}
        title="Workspace settings initialized"
        description="Default policies are currently active. You can customize scanning rules and security thresholds."
        action={<Button variant="default">Configure rule presets</Button>}
      />
    </div>
  );
}
