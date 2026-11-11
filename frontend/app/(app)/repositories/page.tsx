"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircleIcon,
  FolderGit2Icon,
  GitBranchIcon,
  LockIcon,
  UnlockIcon,
} from "lucide-react";

import { EmptyState } from "@/components/app-shell/empty-state";
import { PageHeader } from "@/components/app-shell/page-header";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useWorkspace } from "@/src/features/me/use-me";
import { useRepositories } from "@/src/features/repositories/use-repositories";

function ConnectGitHubDisabledButton() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <span className="inline-flex cursor-not-allowed" tabIndex={0} />
          }
        >
          <Button type="button" disabled>
            <GitBranchIcon data-icon="inline-start" />
            Connect GitHub
          </Button>
        </TooltipTrigger>
        <TooltipContent>Available in the next step</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function RepositoriesPage() {
  const searchParams = useSearchParams();
  const isDemoMode =
    process.env.NODE_ENV === "development" && searchParams.get("demo") === "1";

  const { activeWorkspace } = useWorkspace();
  const [cursorHistory, setCursorHistory] = React.useState<string[]>([]);
  const currentCursor = cursorHistory[cursorHistory.length - 1];

  const { data, isLoading, isError, error, refetch, isFetching } =
    useRepositories(
      { cursor: currentCursor, limit: 20 },
      { enabled: !isDemoMode }
    );

  if (isDemoMode) {
    return <DemoRepositories />;
  }

  const workspaceName = activeWorkspace?.name ?? "this workspace";
  const items = data?.items ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Repositories"
        description={`Repositories connected to ${workspaceName}.`}
        actions={<ConnectGitHubDisabledButton />}
      />

      {isLoading ? (
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Connected repositories</CardTitle>
            <CardDescription>Loading workspace repositories...</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Repository</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Default branch</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 4 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Skeleton className="h-4 w-48" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
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
            {error?.message ||
              "An unexpected error occurred while fetching repositories for this workspace."}
          </AlertDescription>
          <AlertAction>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              Retry
            </Button>
          </AlertAction>
        </Alert>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <EmptyState
              icon={<FolderGit2Icon />}
              title="No repositories connected"
              description="Connect your GitHub account to choose which repositories ReviewPilot monitors for automated code and security reviews."
              action={<ConnectGitHubDisabledButton />}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Connected repositories</CardTitle>
            <CardDescription>
              {data?.total ?? items.length} total{" "}
              {(data?.total ?? items.length) === 1
                ? "repository"
                : "repositories"}{" "}
              in {workspaceName}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Repository</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Default branch</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((repo) => (
                  <TableRow key={repo.id}>
                    <TableCell className="font-mono font-medium text-foreground">
                      {repo.fullName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {repo.provider === "GITHUB" ? "GitHub" : repo.provider}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
                        <GitBranchIcon className="size-3.5" />
                        {repo.defaultBranch}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {repo.isPrivate ? (
                          <LockIcon data-icon="inline-start" />
                        ) : (
                          <UnlockIcon data-icon="inline-start" />
                        )}
                        {repo.isPrivate ? "Private" : "Public"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          repo.status === "CONNECTED" ? "success" : "destructive"
                        }
                      >
                        {repo.status === "CONNECTED"
                          ? "Connected"
                          : "Disconnected"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          {(cursorHistory.length > 0 || data?.nextCursor) ? (
            <CardFooter className="justify-between border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={cursorHistory.length === 0 || isFetching}
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
                disabled={!data?.nextCursor || isFetching}
                onClick={() => {
                  if (data?.nextCursor) {
                    setCursorHistory((prev) => [...prev, data.nextCursor!]);
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
  );
}
