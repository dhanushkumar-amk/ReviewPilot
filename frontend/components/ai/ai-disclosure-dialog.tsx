"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useUpdateAiSettings } from "@/src/features/ai/use-ai";

interface AiDisclosureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AiDisclosureDialog({
  open,
  onOpenChange,
  onSuccess,
}: AiDisclosureDialogProps) {
  const [understood, setUnderstood] = React.useState(false);
  const updateAiSettings = useUpdateAiSettings();

  const handleConfirm = async () => {
    if (!understood) return;
    try {
      await updateAiSettings.mutateAsync(true);
      toast.success("AI assist enabled for this workspace");
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error("Failed to enable AI assist");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enable AI Assist</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground pt-2">
            ReviewPilot sends small code snippets (about 80 lines) from the
            finding&apos;s file to an AI provider to explain issues and draft fixes.
            Secrets are redacted first, and secret findings are never sent.
            Free-tier providers may use data to improve their models, so only
            enable this for code you are comfortable sharing.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-2.5 py-4">
          <Checkbox
            id="understand-ai"
            checked={understood}
            onCheckedChange={(checked) => setUnderstood(Boolean(checked))}
          />
          <label
            htmlFor="understand-ai"
            className="text-xs text-foreground leading-normal cursor-pointer select-none"
          >
            I understand how code snippets are shared with configured AI providers.
          </label>
        </div>

        <DialogFooter className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={!understood || updateAiSettings.isPending}
            onClick={handleConfirm}
          >
            {updateAiSettings.isPending && <Spinner data-icon="inline-start" />}
            Confirm & Enable
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

