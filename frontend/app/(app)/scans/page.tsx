"use client";

import * as React from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircleIcon,
  GitBranchIcon,
  RefreshCwIcon,
  ScanSearchIcon,
} from "lucide-react";

import { EmptyState } from "@/components/app-shell/empty-state";
import { PageHeader } from "@/components/app-shell/page-header";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { useScanStream } from "@/src/features/scans/use-scan-stream";
import { useWorkspace } from "@/src/features/me/use-me";
import { useRepositories } from "@/src/features/repositories/use-repositories";
import {
  useScans,
  type ScanStatus,
  type ScanTrigger,
} from "@/src/features/scans/use-scans";

type StatusFilterValue = "ALL" | ScanStatus;

interface StatusDisplayConfig {
  label: string;
  dotClassName: string;
}

const SCAN_STATUS_DISPLAY: Record<ScanStatus, StatusDisplayConfig> = {
  QUEUED: {
    label: "Queued",
    dotClassName: "bg-muted-foreground",
  },
  RUNNING: {
    label: "Running",
    dotClassName: "bg-link",
  },
  COMPLETED: {
    label: "Completed",
    dotClassName: "bg-success",
  },
  FAILED: {
    label: "Failed",
    dotClassName: "bg-destructive",
  },
  SKIPPED: {
    label: "Skipped",
    dotClassName: "bg-muted-foreground",
  },
};

const TRIGGER_LABELS: Record<ScanTrigger, string> = {
  PUSH: "Push",
  MANUAL: "Manual",
};

function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return formatDistanceToNow(date, { addSuffix: true });
}

function formatDuration(
  startedAt: string | null | undefined,
  finishedAt: string | null | undefined,
): string {
  if (!startedAt || !finishedAt) {
    return "—";
  }
  const start = new Date(startedAt).getTime();
  const end = new Date(finishedAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return "—";
  }
  const totalSeconds = Math.round((end - start) / 1000);
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

export default function ScansPage() {
  const { activeWorkspace } = useWorkspace();
  const [statusFilter, setStatusFilter] =
    React.useState<StatusFilterValue>("ALL");
  const [repositoryFilter, setRepositoryFilter] = React.useState<string>("ALL");
  const [cursorHistory, setCursorHistory] = React.useState<string[]>([]);

  React.useEffect(() => {
    setCursorHistory([]);
  }, [statusFilter, repositoryFilter, activeWorkspace?.id]);

  const currentCursor = cursorHistory[cursorHistory.length - 1];

  const repositoriesQuery = useRepositories({
    limit: 100,
    status: ["CONNECTED"],
  });

  const scansQuery = useScans({
    cursor: currentCursor,
    limit: 20,
    repositoryId: repositoryFilter === "ALL" ? undefined : repositoryFilter,
    status: statusFilter === "ALL" ? undefined : statusFilter,
  });

  const workspaceName = activeWorkspace?.name ?? "this workspace";
  const items = scansQuery.data?.items ?? [];
  const hasActiveFilter = statusFilter !== "ALL" || repositoryFilter !== "ALL";

  const hasRunningOrQueued = items.some(
    (s) => s.status === "QUEUED" || s.status === "RUNNING",
  );
  useScanStream({ enabled: hasRunningOrQueued });

  const repositoryItems = React.useMemo(
    () => [
      { label: "All repositories", value: "ALL" },
      ...(repositoriesQuery.data?.items ?? []).map((repo) => ({
        label: repo.fullName,
        value: repo.id,
      })),
    ],
    [repositoriesQuery.data?.items],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Scans"
        description={`Recent repository scans in ${workspaceName}.`}
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={scansQuery.isFetching}
            onClick={() => void scansQuery.refetch()}
          >
            <RefreshCwIcon data-icon="inline-start" />
            Refresh
          </Button>
        }
      />

      {scansQuery.isLoading ? (
        <Card>
          <CardHeader className="border-b">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-11 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : scansQuery.isError ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>Unable to load scans</AlertTitle>
          <AlertDescription>
            {scansQuery.error instanceof Error && scansQuery.error.message
              ? scansQuery.error.message
              : "Something went wrong while fetching workspace scans."}
          </AlertDescription>
          <AlertAction>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void scansQuery.refetch()}
            >
              Retry
            </Button>
          </AlertAction>
        </Alert>
      ) : items.length === 0 && !hasActiveFilter && cursorHistory.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <EmptyState
              icon={<ScanSearchIcon />}
              title="No scans yet"
              description="Push to a connected repository's default branch or trigger a manual scan from Repositories."
              action={
                <Button
                  size="sm"
                  render={<Link href="/repositories" />}
                  nativeButton={false}
                >
                  Go to Repositories
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="flex flex-col gap-3 pt-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Select
                  items={repositoryItems}
                  value={repositoryFilter}
                  onValueChange={(value) => {
                    if (value) {
                      setRepositoryFilter(value);
                    }
                  }}
                >
                  <SelectTrigger className="w-full sm:w-64" size="sm">
                    <SelectValue placeholder="All repositories">
                      {(value: string | null) => {
                        if (!value || value === "ALL") {
                          return "All repositories";
                        }
                        return (
                          repositoryItems.find((item) => item.value === value)
                            ?.label ?? "All repositories"
                        );
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {repositoryItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>

                <ToggleGroup
                  variant="outline"
                  size="sm"
                  value={[statusFilter]}
                  onValueChange={(next) => {
                    const nextValue = next[0] as StatusFilterValue | undefined;
                    if (nextValue) {
                      setStatusFilter(nextValue);
                    }
                  }}
                >
                  <ToggleGroupItem value="ALL">All</ToggleGroupItem>
                  <ToggleGroupItem value="QUEUED">Queued</ToggleGroupItem>
                  <ToggleGroupItem value="RUNNING">Running</ToggleGroupItem>
                  <ToggleGroupItem value="COMPLETED">Completed</ToggleGroupItem>
                  <ToggleGroupItem value="FAILED">Failed</ToggleGroupItem>
                  <ToggleGroupItem value="SKIPPED">Skipped</ToggleGroupItem>
                </ToggleGroup>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>Scan history</CardTitle>
              <CardDescription>
                Showing {items.length}{" "}
                {items.length === 1 ? "scan" : "scans"} in {workspaceName}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="h-11 border-border">
                    <TableHead>Repository</TableHead>
                    <TableHead>Commit</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow className="h-24 border-border">
                      <TableCell
                        colSpan={7}
                        className="text-center text-sm text-muted-foreground"
                      >
                        <div className="flex flex-col items-center gap-2 py-4">
                          <span>No scans match your current filter.</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setStatusFilter("ALL");
                              setRepositoryFilter("ALL");
                            }}
                          >
                            Clear filters
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((scan) => {
                      const statusMeta = SCAN_STATUS_DISPLAY[scan.status];
                      return (
                        <TableRow key={scan.id} className="h-11 border-border">
                          <TableCell className="font-medium text-foreground">
                            <Link
                              href={`/scans/${scan.id}`}
                              className="hover:underline flex items-center gap-1.5"
                            >
                              {scan.repository.fullName}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-xs text-muted-foreground">
                              {scan.commitSha.slice(0, 7)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                              <GitBranchIcon className="size-3.5" />
                              {scan.branch}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {TRIGGER_LABELS[scan.trigger]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {scan.status === "RUNNING" ? (
                              <div className="flex flex-col gap-1 w-28">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="capitalize text-link">
                                    {scan.phase || "Running"}
                                  </span>
                                  <span className="text-muted-foreground font-mono">
                                    {scan.progress}%
                                  </span>
                                </div>
                                <Progress value={scan.progress} className="h-1.5" />
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-2 text-sm text-foreground">
                                <span
                                  className={cn(
                                    "size-2 shrink-0 rounded-full",
                                    statusMeta.dotClassName,
                                  )}
                                  aria-hidden="true"
                                />
                                {statusMeta.label}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatRelativeTime(scan.startedAt ?? scan.createdAt)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-muted-foreground">
                            {formatDuration(scan.startedAt, scan.finishedAt)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
            {cursorHistory.length > 0 || scansQuery.data?.nextCursor ? (
              <CardFooter className="justify-between border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={cursorHistory.length === 0 || scansQuery.isFetching}
                  onClick={() =>
                    setCursorHistory((prev) => prev.slice(0, -1))
                  }
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={
                    !scansQuery.data?.nextCursor || scansQuery.isFetching
                  }
                  onClick={() => {
                    if (scansQuery.data?.nextCursor) {
                      setCursorHistory((prev) => [
                        ...prev,
                        scansQuery.data!.nextCursor!,
                      ]);
                    }
                  }}
                >
                  Next
                </Button>
              </CardFooter>
            ) : null}
          </Card>
        </div>
      )}
    </div>
  );
}
