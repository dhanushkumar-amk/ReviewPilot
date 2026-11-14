"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  ClockIcon,
  ExternalLinkIcon,
  FileCodeIcon,
  ShieldAlertIcon,
} from "lucide-react";

import { PageHeader } from "@/components/app-shell/page-header";
import { StatCard } from "@/components/app-shell/stat-card";
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
import { apiFetch } from "@/src/lib/api";

interface ScanDetailResponse {
  scan: {
    id: string;
    workspaceId: string;
    repositoryId: string;
    branch: string;
    commitSha: string;
    trigger: string;
    status: string;
    phase: string | null;
    progress: number;
    filesScanned: number | null;
    findingsCount: number;
    durationMs: number | null;
    analyzers: Array<{
      tool: string;
      status: "COMPLETED" | "FAILED" | "SKIPPED";
      durationMs: number;
      findings: number;
      note?: string;
    }> | null;
    errorCode: string | null;
    startedAt: string | null;
    finishedAt: string | null;
    createdAt: string;
    repository: {
      id: string;
      fullName: string;
      defaultBranch: string;
    };
    countsBySeverity: {
      CRITICAL: number;
      HIGH: number;
      MEDIUM: number;
      LOW: number;
      INFO: number;
    };
  };
}

export default function ScanDetailPage() {
  const params = useParams();
  const scanId = params?.id as string;

  const scanQuery = useQuery({
    queryKey: ["scans", scanId],
    queryFn: async () => {
      const payload = await apiFetch<ScanDetailResponse>(`/api/scans/${scanId}`);
      return payload.scan;
    },
    enabled: Boolean(scanId),
  });

  const scan = scanQuery.data;

  if (scanQuery.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (scanQuery.isError || !scan) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>Scan not found</AlertTitle>
        <AlertDescription>
          {scanQuery.error?.message || "The requested scan could not be loaded."}
        </AlertDescription>
        <AlertAction>
          <Button variant="outline" size="sm" render={<Link href="/scans" />} nativeButton={false}>
            Back to Scans
          </Button>
        </AlertAction>
      </Alert>
    );
  }

  const durationStr = scan.durationMs
    ? `${Math.round(scan.durationMs / 1000)}s`
    : "—";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" render={<Link href="/scans" />} nativeButton={false}>
          <ArrowLeftIcon data-icon="inline-start" />
          Back to Scans
        </Button>
      </div>

      <PageHeader
        title={`Scan for ${scan.repository.fullName}`}
        description={`Commit ${scan.commitSha.slice(0, 7)} on branch ${scan.branch}`}
        actions={
          <Button
            size="sm"
            render={
              <Link href={`/findings?repositoryId=${encodeURIComponent(scan.repositoryId)}`} />
            }
            nativeButton={false}
          >
            View findings
            <ExternalLinkIcon data-icon="inline-end" />
          </Button>
        }
      />

      {/* Summary stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Critical Findings"
          value={scan.countsBySeverity.CRITICAL}
          description="High impact vulnerabilities"
          icon={ShieldAlertIcon}
        />
        <StatCard
          title="High & Medium"
          value={scan.countsBySeverity.HIGH + scan.countsBySeverity.MEDIUM}
          description="Security and bug findings"
          icon={ShieldAlertIcon}
        />
        <StatCard
          title="Files scanned"
          value={scan.filesScanned ?? 0}
          description="Extracted and checked"
          icon={FileCodeIcon}
        />
        <StatCard
          title="Scan duration"
          value={durationStr}
          description={
            scan.finishedAt
              ? `Finished ${formatDistanceToNow(new Date(scan.finishedAt), { addSuffix: true })}`
              : "In progress"
          }
          icon={ClockIcon}
        />
      </div>

      {/* Analyzers summary table */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Analyzers</CardTitle>
          <CardDescription>
            Results and execution time per static analysis engine
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="h-11 border-border">
                <TableHead>Tool</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Findings</TableHead>
                <TableHead className="text-right">Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scan.analyzers && scan.analyzers.length > 0 ? (
                scan.analyzers.map((analyzer) => {
                  const isSuccess = analyzer.status === "COMPLETED";
                  const isSkipped = analyzer.status === "SKIPPED";
                  return (
                    <TableRow key={analyzer.tool} className="h-11 border-border">
                      <TableCell className="font-semibold text-foreground">
                        {analyzer.tool}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            isSuccess ? "success" : isSkipped ? "outline" : "destructive"
                          }
                        >
                          {analyzer.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {analyzer.durationMs ? `${analyzer.durationMs}ms` : "—"}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {analyzer.findings}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {analyzer.note || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow className="h-20">
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    No analyzer execution details recorded.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

