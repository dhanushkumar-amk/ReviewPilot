"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useUpdateSandboxSettings } from "@/src/features/sandbox/use-sandbox";

interface SandboxDisclosureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function SandboxDisclosureDialog({
  open,
  onOpenChange,
  onSuccess,
}: SandboxDisclosureDialogProps) {
  const [understood, setUnderstood] = React.useState(false);
  const updateSettings = useUpdateSandboxSettings();

  const handleConfirm = async () => {
    if (!understood) return;
    try {
      await updateSettings.mutateAsync(true);
      toast.success("Enabled test runs in sandbox");
      onOpenChange(false);
      setUnderstood(false);
      onSuccess?.();
    } catch {
      toast.error("Failed to enable test runs");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enable Test Runs</DialogTitle>
          <DialogDescription className="pt-2 text-foreground text-sm leading-relaxed">
            To test a fix, ReviewPilot uploads a copy of your repository to its
            AWS environment, installs dependencies with install scripts turned
            off, and runs your project&apos;s lint, type check, and test scripts
            there.
          </DialogDescription>
        </DialogHeader>

        <p className="text-muted-foreground text-xs leading-relaxed">
          The environment has no access to your accounts or tokens, but it
          can reach the internet, so only run tests on repositories you trust.
          Results are advisory.
        </p>

        <div className="flex items-center space-x-2 pt-2">
          <Checkbox
            id="sandbox-understand-terms"
            checked={understood}
            onCheckedChange={(c) => setUnderstood(Boolean(c))}
          />
          <label
            htmlFor="sandbox-understand-terms"
            className="text-sm font-medium leading-none cursor-pointer"
          >
            I understand
          </label>
        </div>

        <DialogFooter className="pt-4">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setUnderstood(false);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!understood || updateSettings.isPending}
          >
            Enable Test Runs
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
