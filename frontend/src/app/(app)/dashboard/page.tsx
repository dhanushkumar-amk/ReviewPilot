"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ActivityIcon,
  ArrowUpRightIcon,
  CheckCircle2Icon,
  CircleDashedIcon,
  FolderGit2Icon,
  ShieldAlertIcon,
  ShieldCheckIcon,
} from "lucide-react";

import { PageHeader } from "@/components/app-shell/page-header";
import { DemoDashboard } from "@/components/dashboard/demo-dashboard";
import {
  EngineBreakdownChart,
  ReviewVelocityChart,
  ScanPerformanceCard,
  SeverityDistributionChart,
} from "@/components/dashboard/dashboard-charts";
import { ConnectGitHubButton } from "@/components/github/connect-github-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useGithubInstallations } from "@/src/features/github/use-github";
import { formatWorkspaceRole, useWorkspace } from "@/src/features/me/use-me";
import { useRepositories } from "@/src/features/repositories/use-repositories";
import { useScans } from "@/src/features/scans/use-scans";
import {
  useFindings,
  useFindingsSummary,
} from "@/src/features/findings/use-findings";
import { usePullRequests } from "@/src/features/pull-requests/use-pull-requests";
import { StatCard } from "@/components/app-shell/stat-card";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  done: boolean;
  action?: React.ReactNode;
}

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const isDemoMode =
    process.env.NODE_ENV === "development" && searchParams.get("demo") === "1";

  const { user, activeWorkspace, workspaces } = useWorkspace();
  const installationsQuery = useGithubInstallations({ enabled: !isDemoMode });
  const connectedReposQuery = useRepositories(
    { status: ["CONNECTED"], limit: 1 },
    { enabled: !isDemoMode }
  );
  const completedScansQuery = useScans(
    { status: "COMPLETED", limit: 1 },
    { enabled: !isDemoMode }
  );
  const recentScansQuery = useScans(
    { limit: 30 },
    { enabled: !isDemoMode }
  );
  const findingsSummaryQuery = useFindingsSummary({ enabled: !isDemoMode });
  const findingsQuery = useFindings(
    { limit: 100 },
    { enabled: !isDemoMode }
  );
  const pullRequestsQuery = usePullRequests(
    { limit: 30 },
    { enabled: !isDemoMode }
  );

  if (isDemoMode) {
    return <DemoDashboard />;
  }

  const summary = findingsSummaryQuery.data;
  const lastScanDuration = summary?.lastScan?.durationMs
    ? `${Math.round(summary.lastScan.durationMs / 1000)}s`
    : summary?.lastScan?.status
      ? summary.lastScan.status
      : "—";

  const hasCompletedScan = (completedScansQuery.data?.items.length ?? 0) > 0;

  const workspaceName = activeWorkspace?.name ?? "Personal workspace";
  const workspaceRole = formatWorkspaceRole(activeWorkspace?.role);

  const hasGithubInstallation =
    (installationsQuery.data?.installations.length ?? 0) > 0;
  const hasConnectedRepository = (connectedReposQuery.data?.total ?? 0) > 0;

  const steps: OnboardingStep[] = [
    {
      id: "account",
      title: "Create your account",
      description: user?.email
        ? `Signed in as ${user.email} in ${workspaceName}.`
        : "Account verified and personal workspace initialized.",
      done: true,
    },
    {
      id: "github",
      title: "Connect GitHub",
      description:
        "Install the ReviewPilot GitHub App to authorize repository discovery and pull request webhooks.",
      done: hasGithubInstallation,
      action: hasGithubInstallation ? (
        <Button
          variant="outline"
          size="sm"
          render={<Link href="/repositories" />}
          nativeButton={false}
        >
          Manage
        </Button>
      ) : (
        <ConnectGitHubButton variant="outline" size="sm" />
      ),
    },
    {
      id: "repository",
      title: "Choose a repository",
      description:
        "Select which repositories inside this workspace should receive automated code and security reviews.",
      done: hasConnectedRepository,
      action:
        hasGithubInstallation && !hasConnectedRepository ? (
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/repositories" />}
            nativeButton={false}
          >
            Select repository
          </Button>
        ) : undefined,
    },
    {
      id: "scan",
      title: "Run your first scan",
      description:
        "Push to a connected repository's default branch or trigger a manual scan to see your scan history.",
      done: hasCompletedScan,
      action: hasCompletedScan ? (
        <Button
          variant="outline"
          size="sm"
          render={<Link href="/scans" />}
          nativeButton={false}
        >
          View scans
        </Button>
      ) : hasConnectedRepository ? (
        <Button
          variant="outline"
          size="sm"
          render={<Link href="/repositories" />}
          nativeButton={false}
        >
          Run a scan
        </Button>
      ) : undefined,
    },
  ];

  const completedCount = steps.filter((step) => step.done).length;
  const progressPct = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Overview"
        description={`Real-time telemetry, vulnerability distribution, and remediation velocity for ${workspaceName}.`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              render={<Link href="/findings" />}
              nativeButton={false}
            >
              <ShieldAlertIcon data-icon="inline-start" />
              View findings
            </Button>
            <Button
              variant="default"
              render={<Link href="/repositories" />}
              nativeButton={false}
            >
              <FolderGit2Icon data-icon="inline-start" />
              Repositories
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Open findings"
          value={summary?.open ?? 0}
          description="Total active findings across repositories"
          icon={ShieldAlertIcon}
        />
        <StatCard
          title="Critical severity"
          value={summary?.critical ?? 0}
          description="Vulnerabilities needing immediate attention"
          icon={ShieldAlertIcon}
        />
        <StatCard
          title="Scans today"
          value={summary?.scansToday ?? 0}
          description="Total scans completed or run today"
          icon={ActivityIcon}
        />
        <StatCard
          title="Last scan duration"
          value={lastScanDuration}
          description={
            summary?.lastScan?.finishedAt
              ? `Completed ${new Date(summary.lastScan.finishedAt).toLocaleTimeString()}`
              : "No scans finished yet"
          }
          icon={ShieldCheckIcon}
        />
      </div>

      {/* Primary Analytics Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ReviewVelocityChart
          scans={recentScansQuery.data?.items}
          pullRequests={pullRequestsQuery.data?.pullRequests}
          findings={findingsQuery.data?.items}
          className="lg:col-span-2"
        />
        <SeverityDistributionChart
          summary={summary}
          className="lg:col-span-1"
        />
      </div>

      {/* Secondary Insights Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <EngineBreakdownChart
          findings={findingsQuery.data?.items}
          className="lg:col-span-1"
        />
        <ScanPerformanceCard
          scans={recentScansQuery.data?.items}
          className="lg:col-span-1"
        />
        <Card className="flex flex-col lg:col-span-1">
          <CardHeader className="border-b pb-4">
            <CardTitle>Active workspace</CardTitle>
            <CardDescription>
              All repositories, scans, and findings are isolated to this workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3.5 pt-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Name</span>
              <span className="text-sm font-semibold text-foreground">
                {workspaceName}
              </span>
            </div>

            {activeWorkspace?.slug ? (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">Slug</span>
                <span className="font-mono text-xs text-foreground">
                  {activeWorkspace.slug}
                </span>
              </div>
            ) : null}

            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Your role</span>
              <div>
                <Badge variant="outline">{workspaceRole}</Badge>
              </div>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">
                Workspaces accessible
              </span>
              <span className="font-mono text-sm font-medium text-foreground">
                {workspaces.length}
              </span>
            </div>
          </CardContent>
          <CardFooter className="justify-between border-t py-3">
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/repositories" />}
              nativeButton={false}
            >
              Repositories
              <ArrowUpRightIcon data-icon="inline-end" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/team" />}
              nativeButton={false}
            >
              Members
              <ArrowUpRightIcon data-icon="inline-end" />
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Onboarding Checklist Card */}
      <Card className="min-w-0">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Workspace setup & onboarding</CardTitle>
              <CardDescription>
                Follow these steps to connect your repositories and configure automated pull request reviews.
              </CardDescription>
            </div>
            <CardAction>
              <Badge variant={completedCount === steps.length ? "success" : "secondary"}>
                {completedCount} of {steps.length} complete
              </Badge>
            </CardAction>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 pt-5">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Setup progress</span>
              <span className="font-mono tabular-nums">{progressPct}%</span>
            </div>
            <Progress value={progressPct} />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {step.done ? (
                      <CheckCircle2Icon className="size-5 text-success" />
                    ) : (
                      <CircleDashedIcon className="size-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        0{index + 1}
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {step.title}
                      </span>
                      <Badge variant={step.done ? "success" : "outline"}>
                        {step.done ? "Done" : "Not started"}
                      </Badge>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </div>
                {step.action ? (
                  <div className="shrink-0 self-start sm:self-center">
                    {step.action}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
