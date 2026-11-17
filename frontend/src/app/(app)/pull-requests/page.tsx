"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircleIcon,
  ExternalLinkIcon,
  GitMergeIcon,
  GitPullRequestIcon,
  RefreshCwIcon,
  SearchIcon,
  ShieldAlertIcon,
  SparklesIcon,
} from "lucide-react";

import { PageHeader } from "@/components/app-shell/page-header";
import { StatCard } from "@/components/app-shell/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Spinner } from "@/components/ui/spinner";
import { PullRequestSheet } from "@/components/pull-requests/pull-request-sheet";
import {
  usePullRequests,
  usePullRequestUsage,
  type PullRequestItem,
} from "@/src/features/pull-requests/use-pull-requests";

export default function PullRequestsPage() {
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [selectedPrId, setSelectedPrId] = React.useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
    error,
  } = usePullRequests({
    status: statusFilter,
  });

  const usageQuery = usePullRequestUsage();

  const pullRequests = data?.pullRequests || [];

  const filteredPrs = pullRequests.filter((pr) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      pr.title.toLowerCase().includes(q) ||
      pr.repository.fullName.toLowerCase().includes(q) ||
      pr.branchName.toLowerCase().includes(q) ||
      pr.finding.ruleId.toLowerCase().includes(q) ||
      (pr.githubNumber && String(pr.githubNumber).includes(q))
    );
  });

  const openCount = pullRequests.filter((p) => p.status === "OPEN").length;
  const mergedCount = pullRequests.filter((p) => p.status === "MERGED").length;
  const countToday = usageQuery.data?.countToday ?? 0;
  const limit = usageQuery.data?.limit ?? 10;

  const renderStatusBadge = (status: PullRequestItem["status"]) => {
    switch (status) {
      case "OPEN":
        return (
          <Badge
            variant="secondary"
            className="bg-success/15 text-success border-success/30 font-medium text-xs"
          >
            Open
          </Badge>
        );
      case "MERGED":
        return (
          <Badge
            variant="secondary"
            className="bg-purple-500/15 text-purple-600 border-purple-500/30 font-medium text-xs"
          >
            Merged
          </Badge>
        );
      case "CLOSED":
        return (
          <Badge variant="outline" className="text-muted-foreground font-medium text-xs">
            Closed
          </Badge>
        );
      case "FAILED":
        return (
          <Badge variant="destructive" className="font-medium text-xs">
            Failed
          </Badge>
        );
      case "CREATING":
        return (
          <Badge variant="outline" className="text-amber-500 border-amber-500/30 font-medium text-xs gap-1">
            <Spinner className="size-2.5" />
            Creating
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pull requests"
        description="Monitor automated fix branches, CI check statuses, and human-gated merge workflows."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              disabled={isRefetching}
              className="gap-1.5 text-xs"
            >
              <RefreshCwIcon className={`size-3.5 ${isRefetching ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
            <Button
              size="sm"
              render={<Link href="/findings" />}
              nativeButton={false}
              className="gap-1.5 text-xs font-medium"
            >
              <SparklesIcon className="size-3.5" />
              <span>Fix a Finding</span>
            </Button>
          </div>
        }
      />

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Open Pull Requests"
          value={isLoading ? "…" : String(openCount)}
          description="Pending human merge"
          icon={GitPullRequestIcon}
        />
        <StatCard
          title="Merged Fixes"
          value={isLoading ? "…" : String(mergedCount)}
          description="Safely landed in trunk"
          icon={GitMergeIcon}
        />
        <StatCard
          title="Daily Quota (Today)"
          value={`${countToday} / ${limit}`}
          description={`${Math.max(0, limit - countToday)} PR creations remaining`}
          icon={ShieldAlertIcon}
        />
      </div>

      {/* Main Table Card */}
      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base font-semibold">ReviewPilot Fix Pull Requests</CardTitle>
            <CardDescription className="text-xs">
              Every automated write is isolated to a designated fix branch and merged only with human confirmation.
            </CardDescription>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <InputGroup className="w-full sm:w-64">
              <InputGroupAddon>
                <SearchIcon className="size-3.5 text-muted-foreground" />
              </InputGroupAddon>
              <InputGroupInput
                placeholder="Search PR, repo, branch..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 text-xs"
              />
            </InputGroup>

            <ToggleGroup
              value={[statusFilter]}
              onValueChange={(val) => {
                const selected = Array.isArray(val) ? val[0] : val;
                if (selected) setStatusFilter(selected);
              }}
              className="justify-start"
            >
              <ToggleGroupItem value="ALL" className="text-xs h-8 px-2.5">All</ToggleGroupItem>
              <ToggleGroupItem value="OPEN" className="text-xs h-8 px-2.5">Open</ToggleGroupItem>
              <ToggleGroupItem value="MERGED" className="text-xs h-8 px-2.5">Merged</ToggleGroupItem>
              <ToggleGroupItem value="CLOSED" className="text-xs h-8 px-2.5">Closed</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Spinner className="size-5" />
              <span className="text-xs">Loading pull requests...</span>
            </div>
          ) : error ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-destructive">
              <AlertCircleIcon className="size-5" />
              <span className="text-xs">Failed to load pull requests</span>
            </div>
          ) : filteredPrs.length === 0 ? (
            <div className="py-16 text-center text-xs text-muted-foreground">
              No pull requests found. Generate fix proposals from the{" "}
              <Link href="/findings" className="text-primary underline">
                Findings page
              </Link>
              .
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">PR</TableHead>
                    <TableHead>Title & Target</TableHead>
                    <TableHead>Repository</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPrs.map((pr) => (
                    <TableRow
                      key={pr.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedPrId(pr.id);
                        setSheetOpen(true);
                      }}
                    >
                      <TableCell className="font-mono text-xs font-semibold">
                        {pr.githubNumber ? `#${pr.githubNumber}` : "Draft"}
                      </TableCell>
                      <TableCell className="max-w-[320px]">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-xs truncate leading-snug">
                            {pr.title}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-mono truncate">
                            {pr.finding.filePath} ({pr.finding.ruleId})
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {pr.repository.fullName}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground truncate max-w-[160px]">
                        {pr.branchName}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            pr.riskLevel === "HIGH"
                              ? "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                              : ""
                          }`}
                        >
                          {pr.riskLevel}
                        </Badge>
                      </TableCell>
                      <TableCell>{renderStatusBadge(pr.status)}</TableCell>
                      <TableCell className="text-right">
                        <div
                          className="flex items-center justify-end gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {pr.htmlUrl && (
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              render={
                                <Link
                                  href={pr.htmlUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                />
                              }
                              nativeButton={false}
                              title="Open on GitHub"
                            >
                              <ExternalLinkIcon className="size-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => {
                              setSelectedPrId(pr.id);
                              setSheetOpen(true);
                            }}
                            className="text-xs h-7"
                          >
                            Details
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pull Request Detail Sheet */}
      <PullRequestSheet
        pullRequestId={selectedPrId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
