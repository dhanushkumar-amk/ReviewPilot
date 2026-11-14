"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  AlertCircleIcon,
  ExternalLinkIcon,
  FolderGit2Icon,
  GitBranchIcon,
  InfoIcon,
  PlayIcon,
  RefreshCwIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";

import { EmptyState } from "@/components/app-shell/empty-state";
import { PageHeader } from "@/components/app-shell/page-header";
import { ConnectGitHubButton } from "@/components/github/connect-github-button";
import { DemoRepositories } from "@/components/repositories/demo-repositories";
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
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useGithubInstallations,
  useSyncGithubInstallation,
} from "@/src/features/github/use-github";
import { useWorkspace } from "@/src/features/me/use-me";
import {
  useConnectRepository,
  useDisconnectRepository,
  useRepositories,
  useTriggerManualScan,
  type RepoStatus,
} from "@/src/features/repositories/use-repositories";
import type { ScanStatus } from "@/src/features/scans/use-scans";
import { cn } from "@/lib/utils";

const GITHUB_ERROR_MESSAGES: Record<string, string> = {
  invalid_intent: "That connection request expired. Please try again.",
  installation_not_owned: "We could not verify that installation belongs to you.",
  installation_already_linked:
    "That GitHub installation is already connected to another workspace.",
  unknown: "We could not connect GitHub. Please try again.",
};

type StatusFilterValue = "ALL" | RepoStatus;

interface StatusDisplayConfig {
  label: string;
  dotClassName: string;
}

const STATUS_DISPLAY: Record<RepoStatus, StatusDisplayConfig> = {
  AVAILABLE: {
    label: "Available",
    dotClassName: "bg-link",
  },
  CONNECTED: {
    label: "Connected",
    dotClassName: "bg-success",
  },
  DISCONNECTED: {
    label: "Disconnected",
    dotClassName: "bg-muted-foreground",
  },
  REMOVED: {
    label: "Removed",
    dotClassName: "bg-destructive",
  },
};

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

function formatRelativeOrDash(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return formatDistanceToNow(date, { addSuffix: true });
}

function formatLastSynced(lastSyncedAt: string | null | undefined): string {
  if (!lastSyncedAt) {
    return "Never synced";
  }
  const date = new Date(lastSyncedAt);
  if (Number.isNaN(date.getTime())) {
    return "Never synced";
  }
  return `Last synced ${formatDistanceToNow(date, { addSuffix: true })}`;
}

export default function RepositoriesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isDemoMode =
    process.env.NODE_ENV === "development" && searchParams.get("demo") === "1";

  const { activeWorkspace } = useWorkspace();
  const role = activeWorkspace?.role?.trim().toLowerCase();
  const canManage = role === "owner" || role === "admin";

  const [banner, setBanner] = React.useState<{
    kind: "error" | "notice";
    title: string;
    message: string;
  } | null>(null);
  const handledRedirectRef = React.useRef<string | null>(null);

  const [searchInput, setSearchInput] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] =
    React.useState<StatusFilterValue>("ALL");
  const [cursorHistory, setCursorHistory] = React.useState<string[]>([]);
  const [pendingRepoId, setPendingRepoId] = React.useState<string | null>(null);
  const [scanningRepoId, setScanningRepoId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  React.useEffect(() => {
    setCursorHistory([]);
  }, [debouncedSearch, statusFilter, activeWorkspace?.id]);

  const installationsQuery = useGithubInstallations({ enabled: !isDemoMode });
  const syncMutation = useSyncGithubInstallation();
  const connectMutation = useConnectRepository();
  const disconnectMutation = useDisconnectRepository();
  const scanMutation = useTriggerManualScan();

  React.useEffect(() => {
    if (isDemoMode) return;

    const connectedParam = searchParams.get("connected");
    const githubErrorParam = searchParams.get("github_error");
    const githubNoticeParam = searchParams.get("github_notice");

    if (!connectedParam && !githubErrorParam && !githubNoticeParam) {
      return;
    }

    const signature = `${connectedParam ?? ""}|${githubErrorParam ?? ""}|${githubNoticeParam ?? ""}`;
    if (handledRedirectRef.current === signature) {
      return;
    }
    handledRedirectRef.current = signature;

    if (connectedParam === "1") {
      toast.success("GitHub connected");
      setBanner(null);
    } else if (githubErrorParam) {
      setBanner({
        kind: "error",
        title: "GitHub connection failed",
        message:
          GITHUB_ERROR_MESSAGES[githubErrorParam] ??
          GITHUB_ERROR_MESSAGES.unknown,
      });
    } else if (githubNoticeParam === "request_pending") {
      setBanner({
        kind: "notice",
        title: "Approval requested",
        message:
          "Your request is waiting for an organization owner to approve it.",
      });
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("connected");
    nextParams.delete("github_error");
    nextParams.delete("github_notice");
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  }, [isDemoMode, pathname, router, searchParams]);

  const currentCursor = cursorHistory[cursorHistory.length - 1];
  const activeStatuses: RepoStatus[] | undefined =
    statusFilter === "ALL" ? undefined : [statusFilter];

  const repositoriesQuery = useRepositories(
    {
      cursor: currentCursor,
      limit: 20,
      status: activeStatuses,
      search: debouncedSearch || undefined,
    },
    { enabled: !isDemoMode }
  );

  if (isDemoMode) {
    return <DemoRepositories />;
  }

  const workspaceName = activeWorkspace?.name ?? "this workspace";
  const installations = installationsQuery.data?.installations ?? [];
  const primaryInstallation = installations[0] ?? null;
  const hasInstallation = installations.length > 0;
  const items = repositoriesQuery.data?.items ?? [];
  const hasActiveFilter =
    statusFilter !== "ALL" || debouncedSearch.length > 0;

  const isLoading = installationsQuery.isLoading || repositoriesQuery.isLoading;
  const queryError = installationsQuery.error ?? repositoriesQuery.error;
  const isError = installationsQuery.isError || repositoriesQuery.isError;

  const handleSync = async () => {
    if (!primaryInstallation || !canManage || syncMutation.isPending) {
      return;
    }

    try {
      const result = await syncMutation.mutateAsync(primaryInstallation.id);
      toast.success(
        `Synced ${result.synced} ${result.synced === 1 ? "repository" : "repositories"}`
      );
    } catch (err) {
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : "Unable to sync repositories."
      );
    }
  };

  const handleConnectRepo = async (repoId: string, fullName: string) => {
    if (!canManage || pendingRepoId) return;
    setPendingRepoId(repoId);
    try {
      await connectMutation.mutateAsync(repoId);
      toast.success(`Connected ${fullName}`);
    } catch (err) {
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : "Unable to connect repository."
      );
    } finally {
      setPendingRepoId(null);
    }
  };

  const handleDisconnectRepo = async (repoId: string, fullName: string) => {
    if (!canManage || pendingRepoId) return;
    setPendingRepoId(repoId);
    try {
      await disconnectMutation.mutateAsync(repoId);
      toast.success(`Disconnected ${fullName}`);
    } catch (err) {
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : "Unable to disconnect repository."
      );
    } finally {
      setPendingRepoId(null);
    }
  };

  const handleScanNow = async (repoId: string) => {
    if (scanningRepoId) return;
    setScanningRepoId(repoId);
    try {
      await scanMutation.mutateAsync(repoId);
      toast.success("Scan queued");
    } catch (err) {
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : "Unable to queue scan."
      );
    } finally {
      setScanningRepoId(null);
    }
  };

  const handleRetry = () => {
    void installationsQuery.refetch();
    void repositoriesQuery.refetch();
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Repositories"
        description={`Repositories connected to ${workspaceName}.`}
        actions={
          <ConnectGitHubButton
            variant={hasInstallation ? "outline" : "default"}
          />
        }
      />

      {banner ? (
        <Alert>
          {banner.kind === "notice" ? <InfoIcon /> : <AlertCircleIcon />}
          <AlertTitle>{banner.title}</AlertTitle>
          <AlertDescription>{banner.message}</AlertDescription>
          <AlertAction>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Dismiss message"
              onClick={() => setBanner(null)}
            >
              <XIcon />
            </Button>
          </AlertAction>
        </Alert>
      ) : null}

      {isLoading ? (
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Repositories</CardTitle>
            <CardDescription>Loading workspace repositories...</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="h-11">
                  <TableHead>Repository</TableHead>
                  <TableHead>Default branch</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 4 }).map((_, index) => (
                  <TableRow key={index} className="h-11">
                    <TableCell>
                      <Skeleton className="h-4 w-52" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-7 w-20" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>Unable to load repositories</AlertTitle>
          <AlertDescription>
            {queryError?.message ||
              "An unexpected error occurred while fetching repositories for this workspace."}
          </AlertDescription>
          <AlertAction>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRetry}
              disabled={
                installationsQuery.isFetching || repositoriesQuery.isFetching
              }
            >
              Retry
            </Button>
          </AlertAction>
        </Alert>
      ) : !hasInstallation ? (
        <Card>
          <CardContent className="py-10">
            <EmptyState
              icon={<FolderGit2Icon />}
              title="Connect GitHub to see your repositories"
              description="Install the ReviewPilot GitHub App on your account or organization to discover repositories and choose which ones to scan."
              action={<ConnectGitHubButton />}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="flex flex-col gap-4 pt-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                  <InputGroup className="w-full sm:max-w-xs">
                    <InputGroupAddon>
                      <SearchIcon />
                    </InputGroupAddon>
                    <InputGroupInput
                      type="search"
                      placeholder="Search repositories..."
                      aria-label="Search repositories"
                      value={searchInput}
                      onChange={(event) => setSearchInput(event.target.value)}
                    />
                  </InputGroup>

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
                    <ToggleGroupItem value="AVAILABLE">Available</ToggleGroupItem>
                    <ToggleGroupItem value="CONNECTED">Connected</ToggleGroupItem>
                    <ToggleGroupItem value="DISCONNECTED">
                      Disconnected
                    </ToggleGroupItem>
                    <ToggleGroupItem value="REMOVED">Removed</ToggleGroupItem>
                  </ToggleGroup>
                </div>

                {primaryInstallation ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {formatLastSynced(primaryInstallation.lastSyncedAt)}
                    </span>

                    {canManage ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={syncMutation.isPending}
                        onClick={() => void handleSync()}
                      >
                        {syncMutation.isPending ? (
                          <Spinner data-icon="inline-start" />
                        ) : (
                          <RefreshCwIcon data-icon="inline-start" />
                        )}
                        Sync
                      </Button>
                    ) : (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <span
                                className="inline-flex cursor-not-allowed"
                                tabIndex={0}
                              />
                            }
                          >
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled
                            >
                              <RefreshCwIcon data-icon="inline-start" />
                              Sync
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            Only owners and admins can sync repositories.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      render={
                        <a
                          href={primaryInstallation.htmlUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        />
                      }
                      nativeButton={false}
                    >
                      Manage on GitHub
                      <ExternalLinkIcon data-icon="inline-end" />
                    </Button>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {items.length === 0 && !hasActiveFilter ? (
            <Card>
              <CardContent className="py-10">
                <EmptyState
                  icon={<FolderGit2Icon />}
                  title="No repositories shared with ReviewPilot"
                  description="Update your GitHub App installation settings to grant ReviewPilot access to one or more repositories, then sync."
                  action={
                    primaryInstallation ? (
                      <Button
                        variant="outline"
                        render={
                          <a
                            href={primaryInstallation.htmlUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          />
                        }
                        nativeButton={false}
                      >
                        Manage on GitHub
                        <ExternalLinkIcon data-icon="inline-end" />
                      </Button>
                    ) : undefined
                  }
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Workspace repositories</CardTitle>
                <CardDescription>
                  {repositoriesQuery.data?.total ?? items.length} total{" "}
                  {(repositoriesQuery.data?.total ?? items.length) === 1
                    ? "repository"
                    : "repositories"}{" "}
                  in {workspaceName}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="h-11 border-border">
                      <TableHead>Repository</TableHead>
                      <TableHead>Default branch</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last push</TableHead>
                      <TableHead>Last scan</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow className="h-24 border-border">
                        <TableCell
                          colSpan={6}
                          className="text-center text-sm text-muted-foreground"
                        >
                          <div className="flex flex-col items-center gap-2 py-4">
                            <span>No repositories match your current filter.</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSearchInput("");
                                setStatusFilter("ALL");
                              }}
                            >
                              Clear filters
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((repo) => {
                        const statusMeta = STATUS_DISPLAY[repo.status];
                        const isRowBusy = pendingRepoId === repo.id;
                        const canConnect =
                          repo.status === "AVAILABLE" ||
                          repo.status === "DISCONNECTED";
                        const canDisconnect = repo.status === "CONNECTED";

                        return (
                          <TableRow key={repo.id} className="h-11 border-border">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground">
                                  {repo.fullName}
                                </span>
                                {repo.isPrivate ? (
                                  <Badge variant="secondary">Private</Badge>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                                <GitBranchIcon className="size-3.5" />
                                {repo.defaultBranch}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center gap-2 text-sm text-foreground">
                                <span
                                  className={cn(
                                    "size-2 shrink-0 rounded-full",
                                    statusMeta.dotClassName
                                  )}
                                  aria-hidden="true"
                                />
                                {statusMeta.label}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatRelativeOrDash(repo.lastPushAt)}
                            </TableCell>
                            <TableCell>
                              {repo.lastScan ? (
                                <span className="inline-flex items-center gap-2 text-sm text-foreground">
                                  <span
                                    className={cn(
                                      "size-2 shrink-0 rounded-full",
                                      SCAN_STATUS_DISPLAY[repo.lastScan.status]
                                        .dotClassName
                                    )}
                                    aria-hidden="true"
                                  />
                                  <span>
                                    {
                                      SCAN_STATUS_DISPLAY[repo.lastScan.status]
                                        .label
                                    }
                                  </span>
                                  <span className="font-mono text-xs text-muted-foreground">
                                    {repo.lastScan.commitSha.slice(0, 7)}
                                  </span>
                                  {typeof repo.lastScan.findingsCount === "number" && (
                                    <Badge
                                      variant={
                                        repo.lastScan.findingsCount > 0
                                          ? "destructive"
                                          : "secondary"
                                      }
                                      className="text-xs h-5 px-1.5"
                                    >
                                      {repo.lastScan.findingsCount}{" "}
                                      {repo.lastScan.findingsCount === 1
                                        ? "finding"
                                        : "findings"}
                                    </Badge>
                                  )}
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground">
                                  —
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="inline-flex items-center justify-end gap-2">
                                {repo.status === "CONNECTED" ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={Boolean(scanningRepoId)}
                                    onClick={() => void handleScanNow(repo.id)}
                                  >
                                    {scanningRepoId === repo.id ? (
                                      <Spinner data-icon="inline-start" />
                                    ) : (
                                      <PlayIcon data-icon="inline-start" />
                                    )}
                                    Scan now
                                  </Button>
                                ) : null}
                                {repo.status === "REMOVED" ? (
                                  <span className="text-xs text-muted-foreground">
                                    Removed on GitHub
                                  </span>
                                ) : !canManage ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger
                                        render={
                                          <span
                                            className="inline-flex cursor-not-allowed"
                                            tabIndex={0}
                                          />
                                        }
                                      >
                                        <Button
                                          type="button"
                                          variant={
                                            canConnect ? "default" : "outline"
                                          }
                                          size="sm"
                                          disabled
                                        >
                                          {canConnect ? "Connect" : "Disconnect"}
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Only owners and admins can manage
                                        repositories.
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : canConnect ? (
                                  <Button
                                    type="button"
                                    variant="default"
                                    size="sm"
                                    disabled={Boolean(pendingRepoId)}
                                    onClick={() =>
                                      void handleConnectRepo(
                                        repo.id,
                                        repo.fullName
                                      )
                                    }
                                  >
                                    {isRowBusy ? (
                                      <Spinner data-icon="inline-start" />
                                    ) : null}
                                    Connect
                                  </Button>
                                ) : canDisconnect ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={Boolean(pendingRepoId)}
                                    onClick={() =>
                                      void handleDisconnectRepo(
                                        repo.id,
                                        repo.fullName
                                      )
                                    }
                                  >
                                    {isRowBusy ? (
                                      <Spinner data-icon="inline-start" />
                                    ) : null}
                                    Disconnect
                                  </Button>
                                ) : null}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
              {cursorHistory.length > 0 || repositoriesQuery.data?.nextCursor ? (
                <CardFooter className="justify-between border-t">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={
                      cursorHistory.length === 0 || repositoriesQuery.isFetching
                    }
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
                      !repositoriesQuery.data?.nextCursor ||
                      repositoriesQuery.isFetching
                    }
                    onClick={() => {
                      if (repositoriesQuery.data?.nextCursor) {
                        setCursorHistory((prev) => [
                          ...prev,
                          repositoriesQuery.data!.nextCursor!,
                        ]);
                      }
                    }}
                  >
                    Next
                  </Button>
                </CardFooter>
              ) : null}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
