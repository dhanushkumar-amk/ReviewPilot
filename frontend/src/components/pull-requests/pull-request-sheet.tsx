"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  GitMergeIcon,
  GitPullRequestIcon,
  HelpCircleIcon,
  Loader2Icon,
  MinusCircleIcon,
  RefreshCwIcon,
  XCircleIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import {
  useClosePullRequest,
  useMergePullRequest,
  usePullRequest,
  type CheckItem,
} from "@/src/features/pull-requests/use-pull-requests";
import { useWorkspace } from "@/src/features/me/use-me";

interface PullRequestSheetProps {
  pullRequestId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PullRequestSheet({
  pullRequestId,
  open,
  onOpenChange,
}: PullRequestSheetProps) {
  const { activeWorkspace } = useWorkspace();
  const role = activeWorkspace?.role?.trim().toLowerCase();
  const isOwnerOrAdmin = role === "owner" || role === "admin";

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
    error,
  } = usePullRequest(pullRequestId, {
    enabled: open && Boolean(pullRequestId),
    refetchInterval: open ? 10_000 : undefined, // 10s live polling while open
  });

  const mergeMutation = useMergePullRequest();
  const closeMutation = useClosePullRequest();

  const [mergeDialogOpen, setMergeDialogOpen] = React.useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = React.useState(false);
  const [mergeMethod, setMergeMethod] = React.useState<"squash" | "merge" | "rebase">("squash");
  const [confirmFailingChecks, setConfirmFailingChecks] = React.useState(false);

  const pr = data?.pullRequest;
  const liveStatus = data?.liveStatus;

  const handleMerge = async () => {
    if (!pr || !liveStatus) return;
    try {
      await mergeMutation.mutateAsync({
        pullRequestId: pr.id,
        expectedHeadSha: liveStatus.headSha,
        method: mergeMethod,
        confirmFailingChecks,
      });
      toast.success("Pull request merged successfully!");
      setMergeDialogOpen(false);
      void refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err || "Failed to merge pull request");
      toast.error(msg);
    }
  };

  const handleClose = async () => {
    if (!pr) return;
    try {
      await closeMutation.mutateAsync(pr.id);
      toast.success("Pull request closed");
      setCloseDialogOpen(false);
      void refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err || "Failed to close pull request");
      toast.error(msg);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return <Badge variant="secondary" className="bg-success/15 text-success border-success/30 font-medium">Open</Badge>;
      case "MERGED":
        return <Badge variant="secondary" className="bg-purple-500/15 text-purple-600 border-purple-500/30 font-medium">Merged</Badge>;
      case "CLOSED":
        return <Badge variant="outline" className="text-muted-foreground font-medium">Closed</Badge>;
      case "FAILED":
        return <Badge variant="destructive" className="font-medium">Failed</Badge>;
      default:
        return <Badge variant="outline" className="font-medium">{status}</Badge>;
    }
  };

  const renderCheckIcon = (check: CheckItem) => {
    if (check.status === "queued" || check.status === "in_progress" || check.status === "pending") {
      return <Loader2Icon className="size-3.5 text-amber-500 animate-spin shrink-0" />;
    }
    switch (check.conclusion) {
      case "success":
        return <CheckCircle2Icon className="size-3.5 text-success shrink-0" />;
      case "failure":
      case "timed_out":
      case "cancelled":
        return <XCircleIcon className="size-3.5 text-destructive shrink-0" />;
      case "neutral":
      case "skipped":
        return <MinusCircleIcon className="size-3.5 text-muted-foreground shrink-0" />;
      default:
        return <HelpCircleIcon className="size-3.5 text-muted-foreground shrink-0" />;
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0 flex flex-col gap-0 border-l border-border bg-card">
          <SheetHeader className="p-6 border-b border-border/80 sticky top-0 bg-card z-10">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <GitPullRequestIcon className="size-5 text-primary shrink-0" />
                <span className="font-mono text-sm text-muted-foreground">
                  {pr?.githubNumber ? `#${pr.githubNumber}` : "Draft PR"}
                </span>
                {pr && getStatusBadge(pr.status)}
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => void refetch()}
                  disabled={isRefetching}
                  title="Refresh status"
                >
                  <RefreshCwIcon className={`size-3.5 ${isRefetching ? "animate-spin" : ""}`} />
                </Button>
                {pr?.htmlUrl && (
                  <Button
                    variant="outline"
                    size="xs"
                    render={
                      <Link href={pr.htmlUrl} target="_blank" rel="noopener noreferrer" />
                    }
                    nativeButton={false}
                    className="gap-1 text-xs"
                  >
                    <span>GitHub</span>
                    <ExternalLinkIcon className="size-3" />
                  </Button>
                )}
              </div>
            </div>
            <SheetTitle className="text-base font-semibold leading-tight pt-1">
              {pr?.title || "Pull Request"}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground flex items-center gap-2 pt-0.5">
              <span>{pr?.repository.fullName}</span>
              <span>•</span>
              <span className="font-mono">{pr?.baseBranch} &larr; {pr?.branchName}</span>
            </SheetDescription>
          </SheetHeader>

          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Spinner className="size-5" />
              <span className="text-xs">Loading pull request status...</span>
            </div>
          ) : error || !pr ? (
            <div className="p-6 text-xs text-destructive flex items-center gap-2">
              <AlertCircleIcon className="size-4 shrink-0" />
              <span>Failed to load pull request details.</span>
            </div>
          ) : (
            <div className="p-6 flex flex-col gap-5 flex-1">
              {/* Branch Head Changed Warning */}
              {liveStatus?.branchHeadChanged && (
                <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2.5">
                  <AlertTriangleIcon className="size-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Branch Head Diverged: </span>
                    The commit on GitHub differs from what ReviewPilot originally pushed. Review the changes on GitHub before merging.
                  </div>
                </div>
              )}

              {/* Merge Readiness Banner */}
              {pr.status === "OPEN" && liveStatus && (
                <div
                  className={`p-3.5 rounded-lg border text-xs flex items-start gap-3 ${
                    liveStatus.mergeReadiness === "ready"
                      ? "border-success/30 bg-success/10 text-foreground"
                      : liveStatus.mergeReadiness === "checks_failing"
                      ? "border-destructive/30 bg-destructive/10 text-foreground"
                      : liveStatus.mergeReadiness === "checks_pending"
                      ? "border-amber-500/30 bg-amber-500/10 text-foreground"
                      : liveStatus.mergeReadiness === "conflicts"
                      ? "border-destructive/30 bg-destructive/10 text-foreground"
                      : "border-border bg-muted/40 text-muted-foreground"
                  }`}
                >
                  {liveStatus.mergeReadiness === "ready" ? (
                    <CheckCircle2Icon className="size-4 text-success shrink-0 mt-0.5" />
                  ) : liveStatus.mergeReadiness === "checks_failing" ? (
                    <AlertCircleIcon className="size-4 text-destructive shrink-0 mt-0.5" />
                  ) : liveStatus.mergeReadiness === "checks_pending" ? (
                    <Loader2Icon className="size-4 text-amber-500 animate-spin shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangleIcon className="size-4 text-amber-500 shrink-0 mt-0.5" />
                  )}

                  <div className="flex-1 flex flex-col gap-0.5">
                    <span className="font-semibold">
                      {liveStatus.mergeReadiness === "ready" && "Ready to merge"}
                      {liveStatus.mergeReadiness === "checks_failing" && "CI checks failing"}
                      {liveStatus.mergeReadiness === "checks_pending" && "CI checks in progress"}
                      {liveStatus.mergeReadiness === "conflicts" && "Merge conflicts with base branch"}
                      {liveStatus.mergeReadiness === "blocked" && "Blocked by branch protection rules"}
                      {liveStatus.mergeReadiness === "behind" && "Branch is behind default branch"}
                      {liveStatus.mergeReadiness === "unknown" && "Checking merge readiness..."}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {liveStatus.mergeReadiness === "ready" && "All automated checks passed and branch is clean."}
                      {liveStatus.mergeReadiness === "checks_failing" && "One or more GitHub Actions checks or commit statuses failed."}
                      {liveStatus.mergeReadiness === "checks_pending" && "Waiting for GitHub checks to report conclusion."}
                      {liveStatus.mergeReadiness === "conflicts" && "Resolve merge conflicts on GitHub before merging."}
                      {liveStatus.mergeReadiness === "blocked" && "Branch protection rules or review gates require approval."}
                    </span>
                  </div>
                </div>
              )}

              {/* CI Checks & Statuses */}
              <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Automated Checks & CI
                  </span>
                  {liveStatus && (
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {liveStatus.overallChecks}
                    </Badge>
                  )}
                </div>

                {liveStatus?.checks && liveStatus.checks.length > 0 ? (
                  <div className="divide-y divide-border/50 text-xs">
                    {liveStatus.checks.map((c) => (
                      <div key={c.id} className="py-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {renderCheckIcon(c)}
                          <span className="truncate font-medium">{c.name}</span>
                          {c.description && (
                            <span className="truncate text-muted-foreground text-[11px]">
                              — {c.description}
                            </span>
                          )}
                        </div>
                        {c.url && (
                          <Link
                            href={c.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary shrink-0"
                          >
                            <ExternalLinkIcon className="size-3" />
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-2 text-xs text-muted-foreground">
                    No checks or status reports found for this commit.
                  </div>
                )}
              </div>

              {/* Finding & Verification Context */}
              <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3.5 text-xs">
                <span className="font-semibold uppercase tracking-wider text-muted-foreground text-[11px]">
                  Finding & Resolution
                </span>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Rule</span>
                    <span className="font-mono text-xs">{pr.finding.ruleId}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">File</span>
                    <span className="font-mono text-xs truncate block">{pr.finding.filePath}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Severity</span>
                    <Badge variant="outline" className="text-[10px]">{pr.finding.severity}</Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Risk Level</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        pr.riskLevel === "HIGH" ? "border-amber-500 text-amber-600 dark:text-amber-400" : ""
                      }`}
                    >
                      {pr.riskLevel}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Action Buttons for Open PRs */}
              {pr.status === "OPEN" && (
                <div className="mt-auto pt-4 border-t border-border flex items-center justify-between gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCloseDialogOpen(true)}
                    disabled={!isOwnerOrAdmin || closeMutation.isPending}
                    className="text-xs text-destructive hover:text-destructive"
                  >
                    Close PR
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => setMergeDialogOpen(true)}
                    disabled={
                      !isOwnerOrAdmin ||
                      mergeMutation.isPending ||
                      liveStatus?.mergeReadiness === "conflicts" ||
                      liveStatus?.mergeReadiness === "blocked"
                    }
                    className="gap-1.5 text-xs font-medium"
                  >
                    <GitMergeIcon className="size-3.5" />
                    <span>Merge Pull Request</span>
                  </Button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Merge Confirmation Dialog */}
      <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <GitMergeIcon className="size-4 text-primary" />
              <span>Confirm Pull Request Merge</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              ReviewPilot will merge this pull request and delete the fix branch.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2 text-xs">
            <div className="flex flex-col gap-1.5">
              <label className="font-medium text-foreground">Merge Method</label>
              <Select
                value={mergeMethod}
                onValueChange={(val) => setMergeMethod(val as "squash" | "merge" | "rebase")}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="squash" className="text-xs">Squash and merge (recommended)</SelectItem>
                  <SelectItem value="merge" className="text-xs">Create a merge commit</SelectItem>
                  <SelectItem value="rebase" className="text-xs">Rebase and merge</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {liveStatus?.mergeReadiness === "checks_failing" && (
              <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 flex flex-col gap-2">
                <span className="font-semibold text-destructive flex items-center gap-1.5">
                  <AlertTriangleIcon className="size-4" />
                  Checks are failing
                </span>
                <span className="text-muted-foreground text-[11px]">
                  One or more CI checks reported failures. You must explicitly confirm to proceed.
                </span>
                <div className="flex items-center gap-2 pt-1">
                  <Checkbox
                    id="confirm-checks"
                    checked={confirmFailingChecks}
                    onCheckedChange={(c) => setConfirmFailingChecks(Boolean(c))}
                  />
                  <label htmlFor="confirm-checks" className="text-xs font-medium cursor-pointer">
                    I confirm and wish to merge despite failing checks
                  </label>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMergeDialogOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleMerge}
              disabled={
                mergeMutation.isPending ||
                (liveStatus?.mergeReadiness === "checks_failing" && !confirmFailingChecks)
              }
              className="gap-1.5 text-xs"
            >
              {mergeMutation.isPending ? <Spinner className="size-3.5" /> : <GitMergeIcon className="size-3.5" />}
              <span>Confirm & Merge</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Confirmation Dialog */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base text-destructive flex items-center gap-2">
              <XCircleIcon className="size-4" />
              <span>Close Pull Request</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to close this pull request without merging? The fix branch will be deleted.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCloseDialogOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClose}
              disabled={closeMutation.isPending}
              className="text-xs"
            >
              {closeMutation.isPending ? <Spinner className="size-3.5" /> : null}
              <span>Close PR & Delete Branch</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
