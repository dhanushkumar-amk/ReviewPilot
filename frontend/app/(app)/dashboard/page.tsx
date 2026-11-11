"use client";

import * as React from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ActivityIcon,
  ArrowUpRightIcon,
  FolderGit2Icon,
  GitPullRequestIcon,
  PlusIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
} from "lucide-react";

import { PageHeader } from "@/components/app-shell/page-header";
import { StatCard } from "@/components/app-shell/stat-card";
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
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  initialPullRequests,
  initialRepositories,
  initialScanRuns,
  scanActivityChartData,
} from "@/lib/dashboard-data";
import { mockFindings, type Severity } from "@/lib/mock-data";

const chartConfig = {
  reviews: {
    label: "PR reviews",
    color: "var(--primary)",
  },
  findings: {
    label: "Issues flagged",
    color: "var(--destructive)",
  },
  fixed: {
    label: "Patches merged",
    color: "var(--success)",
  },
} satisfies ChartConfig;

function severityBadgeVariant(
  severity: Severity
): React.ComponentProps<typeof Badge>["variant"] {
  if (severity === "Critical" || severity === "High") return "destructive";
  if (severity === "Medium") return "default";
  return "secondary";
}

export default function DashboardPage() {
  const totalFindings = mockFindings.length;
  const openFindings = mockFindings.filter(
    (item) => item.status !== "Fixed"
  ).length;
  const fixedFindings = mockFindings.filter(
    (item) => item.status === "Fixed"
  ).length;
  const criticalCount = mockFindings.filter(
    (item) => item.severity === "Critical"
  ).length;
  const highCount = mockFindings.filter(
    (item) => item.severity === "High"
  ).length;
  const mediumCount = mockFindings.filter(
    (item) => item.severity === "Medium"
  ).length;
  const lowCount = mockFindings.filter(
    (item) => item.severity === "Low"
  ).length;

  const connectedRepos = initialRepositories.filter(
    (repo) => repo.webhookStatus === "Connected"
  ).length;

  const severityRows: {
    label: Severity;
    count: number;
    percent: number;
    variant: React.ComponentProps<typeof Badge>["variant"];
  }[] = [
    {
      label: "Critical",
      count: criticalCount,
      percent: Math.round((criticalCount / totalFindings) * 100),
      variant: "destructive",
    },
    {
      label: "High",
      count: highCount,
      percent: Math.round((highCount / totalFindings) * 100),
      variant: "destructive",
    },
    {
      label: "Medium",
      count: mediumCount,
      percent: Math.round((mediumCount / totalFindings) * 100),
      variant: "default",
    },
    {
      label: "Low",
      count: lowCount,
      percent: Math.round((lowCount / totalFindings) * 100),
      variant: "secondary",
    },
  ];

  const recentFindings = mockFindings.slice(0, 5);
  const activeRun = initialScanRuns[0];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Overview"
        description="Real-time code review telemetry, PR security verdicts, and remediation velocity across your connected repositories."
        actions={
          <>
            <Button
              variant="outline"
              render={<Link href="/repositories" />}
              nativeButton={false}
            >
              <PlusIcon data-icon="inline-start" />
              Connect repository
            </Button>
            <Button
              render={<Link href="/findings" />}
              nativeButton={false}
            >
              <ShieldAlertIcon data-icon="inline-start" />
              Inspect findings
            </Button>
          </>
        }
      />

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Connected repositories"
          value={connectedRepos}
          description={`${initialRepositories.length} total · ${initialRepositories.filter((r) => r.autoScan).length} with auto-scan`}
          icon={FolderGit2Icon}
        />
        <StatCard
          title="Open findings"
          value={openFindings}
          description={`${criticalCount} critical awaiting remediation`}
          badge={{ label: "Action needed", variant: "destructive" }}
        />
        <StatCard
          title="PR reviews (14d)"
          value={324}
          description="Avg review latency 38s across 4 active repos"
          icon={GitPullRequestIcon}
        />
        <StatCard
          title="Patch acceptance"
          value="91%"
          valueClassName="text-success"
          description={`${fixedFindings} inventory issues resolved cleanly`}
          badge={{ label: "+6.4%", variant: "success" }}
        />
      </div>

      {/* Main Analytics + Severity Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Review & remediation velocity</CardTitle>
            <CardDescription>
              Daily pull requests analyzed versus issues detected and patches merged
            </CardDescription>
            <CardAction>
              <Badge variant="outline">Last 11 days</Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[260px] w-full">
              <AreaChart
                data={scanActivityChartData}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent />}
                />
                <Area
                  type="monotone"
                  dataKey="reviews"
                  fill="var(--color-reviews)"
                  fillOpacity={0.14}
                  stroke="var(--color-reviews)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="fixed"
                  fill="var(--color-fixed)"
                  fillOpacity={0.14}
                  stroke="var(--color-fixed)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="findings"
                  fill="var(--color-findings)"
                  fillOpacity={0.12}
                  stroke="var(--color-findings)"
                  strokeWidth={2}
                />
                <ChartLegend content={<ChartLegendContent />} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Findings by severity</CardTitle>
            <CardDescription>
              Click any tier to filter the security workbench
            </CardDescription>
            <CardAction>
              <Badge variant="secondary">{totalFindings} total</Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between gap-4">
            <div className="flex flex-col gap-4">
              {severityRows.map((row) => (
                <Link
                  key={row.label}
                  href={`/findings?severity=${row.label}`}
                  className="group flex flex-col gap-1.5 rounded-lg p-2 -mx-2 transition-colors hover:bg-muted"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={row.variant}>{row.label}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {row.percent}% of inventory
                      </span>
                    </div>
                    <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                      {row.count}
                    </span>
                  </div>
                  <Progress value={row.percent} />
                </Link>
              ))}
            </div>

            <Separator />

            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <ActivityIcon className="size-4 text-primary" />
                <span>
                  Live job:{" "}
                  <span className="font-mono font-medium text-foreground">
                    {activeRun.id}
                  </span>
                </span>
              </div>
              <Badge variant="default">{activeRun.status}</Badge>
            </div>
          </CardContent>
          <CardFooter className="justify-between">
            <span className="text-xs text-muted-foreground">
              {initialPullRequests.length} active PRs monitored
            </span>
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/scans" />}
              nativeButton={false}
            >
              View scans
              <ArrowUpRightIcon data-icon="inline-end" />
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Bottom Split: Recent Findings + Pull Request Queue */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Priority findings queue</CardTitle>
            <CardDescription>
              Highest-severity issues flagged in recent commits and pull requests
            </CardDescription>
            <CardAction>
              <Button
                variant="outline"
                size="sm"
                render={<Link href="/findings" />}
                nativeButton={false}
              >
                Open workbench
                <ArrowUpRightIcon data-icon="inline-end" />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Issue</TableHead>
                  <TableHead>Repository</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentFindings.map((finding) => (
                  <TableRow key={finding.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {finding.id}
                    </TableCell>
                    <TableCell className="max-w-[260px] truncate font-medium">
                      <Link
                        href={`/findings?severity=${finding.severity}`}
                        className="hover:underline"
                      >
                        {finding.title}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {finding.repository}
                    </TableCell>
                    <TableCell>
                      <Badge variant={severityBadgeVariant(finding.severity)}>
                        {finding.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          finding.status === "Fixed" ? "success" : "outline"
                        }
                      >
                        {finding.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Recent pull requests</CardTitle>
            <CardDescription>
              Automated AI diff review verdicts
            </CardDescription>
            <CardAction>
              <ShieldCheckIcon className="size-4 text-success" />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3">
            {initialPullRequests.map((pr) => (
              <Link
                key={pr.id}
                href="/pull-requests"
                className="flex flex-col gap-1.5 rounded-lg border border-border p-3 transition-colors hover:bg-muted"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    {pr.repository} #{pr.number}
                  </span>
                  <Badge
                    variant={
                      pr.verdict === "Approved"
                        ? "success"
                        : pr.verdict === "Changes requested"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {pr.verdict}
                  </Badge>
                </div>
                <span className="truncate text-sm font-medium text-foreground">
                  {pr.title}
                </span>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{pr.author}</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-success">+{pr.additions}</span>
                    <span className="text-destructive">-{pr.deletions}</span>
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
          <CardFooter className="justify-end">
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/pull-requests" />}
              nativeButton={false}
            >
              All pull requests
              <ArrowUpRightIcon data-icon="inline-end" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
