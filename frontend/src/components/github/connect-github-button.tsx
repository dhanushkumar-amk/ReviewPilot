"use client";

import * as React from "react";
import { GitBranchIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useStartGithubInstall } from "@/src/features/github/use-github";
import { useWorkspace } from "@/src/features/me/use-me";

interface ConnectGitHubButtonProps {
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  label?: string;
}

export function ConnectGitHubButton({
  variant = "default",
  size = "default",
  label = "Connect GitHub",
}: ConnectGitHubButtonProps) {
  const { activeWorkspace } = useWorkspace();
  const startInstall = useStartGithubInstall();
  const [isRedirecting, setIsRedirecting] = React.useState(false);

  const role = activeWorkspace?.role?.trim().toLowerCase();
  const canManage = role === "owner" || role === "admin";
  const isBusy = startInstall.isPending || isRedirecting;

  if (!canManage) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            render={
              <span className="inline-flex cursor-not-allowed" tabIndex={0} />
            }
          >
            <Button type="button" variant={variant} size={size} disabled>
              <GitBranchIcon data-icon="inline-start" />
              {label}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Only owners and admins can connect GitHub.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const handleClick = async () => {
    if (isBusy) return;
    try {
      const { url } = await startInstall.mutateAsync();
      setIsRedirecting(true);
      window.location.assign(url);
    } catch (error) {
      setIsRedirecting(false);
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : "Unable to start GitHub connection."
      );
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={isBusy}
      onClick={() => void handleClick()}
    >
      {isBusy ? (
        <Spinner data-icon="inline-start" />
      ) : (
        <GitBranchIcon data-icon="inline-start" />
      )}
      {label}
    </Button>
  );
}

