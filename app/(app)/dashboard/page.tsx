"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/app-shell/empty-state";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { mockFindings, type Severity } from "@/lib/mock-data";
import { WrenchIcon, ShieldCheckIcon } from "lucide-react";

function SeverityBadge({ severity }: { severity: Severity }) {
  switch (severity) {
    case "Critical":
      return (
        <Badge className="border-transparent bg-destructive/15 text-destructive font-medium">
          Critical
        </Badge>
      );
    case "High":
      return (
        <Badge className="border-transparent bg-warning/15 text-warning font-medium">
          High
        </Badge>
      );
    case "Medium":
      return <Badge variant="secondary">Medium</Badge>;
    case "Low":
      return <Badge variant="outline">Low</Badge>;
  }
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const stateParam = searchParams.get("state");
  const isLoading = stateParam === "loading";
  const isEmpty = stateParam === "empty";

  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  const allSelected =
    mockFindings.length > 0 && selectedIds.size === mockFindings.length;
  const isPartiallySelected =
    selectedIds.size > 0 && selectedIds.size < mockFindings.length;

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(mockFindings.map((f) => f.id)));
    }
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <PageHeader
        title="Findings"
        description="Latest scan on commit a1f3c9e, 2 minutes ago"
        actions={
          <Button
            variant="default"
            disabled={selectedIds.size === 0 || isLoading || isEmpty}
            aria-label="Fix selected findings"
          >
            <WrenchIcon data-icon="inline-start" />
            <span>
              {selectedIds.size > 0
                ? `Fix selected (${selectedIds.size})`
                : "Fix selected"}
            </span>
          </Button>
        }
      />

      {/* 4 Stat Cards in a responsive grid, 16px gap (gap-4), 20px padding (p-5) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Open findings */}
        <Card className="p-5 flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Open findings
          </span>
          {isLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <div className="text-2xl font-semibold leading-8 text-foreground">
              {isEmpty ? "0" : "42"}
            </div>
          )}
        </Card>

        {/* Critical */}
        <Card className="p-5 flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Critical
          </span>
          {isLoading ? (
            <Skeleton className="h-8 w-12" />
          ) : (
            <div className="text-2xl font-semibold leading-8 text-destructive">
              {isEmpty ? "0" : "3"}
            </div>
          )}
        </Card>

        {/* Scans today */}
        <Card className="p-5 flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Scans today
          </span>
          {isLoading ? (
            <Skeleton className="h-8 w-14" />
          ) : (
            <div className="text-2xl font-semibold leading-8 text-foreground">
              {isEmpty ? "0" : "18"}
            </div>
          )}
        </Card>

        {/* Queue lag */}
        <Card className="p-5 flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Queue lag
          </span>
          {isLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <div className="text-2xl font-semibold leading-8 text-success">
              0.4s
            </div>
          )}
        </Card>
      </div>

      {/* Table Card */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <CardTitle className="text-base font-semibold">
                Findings list
              </CardTitle>
              <CardDescription>
                Review detected security vulnerabilities, performance regressions, and style issues.
              </CardDescription>
            </div>
            {!isLoading && !isEmpty && selectedIds.size > 0 && (
              <span className="text-xs text-muted-foreground">
                {selectedIds.size} of {mockFindings.length} selected
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col divide-y divide-border">
              <div className="flex h-11 items-center bg-muted/50 px-4 gap-4">
                <Skeleton className="size-4" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-16" />
              </div>
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="flex h-11 items-center px-4 gap-4">
                  <Skeleton className="size-4" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : isEmpty ? (
            <div className="p-8">
              <EmptyState
                icon={<ShieldCheckIcon className="size-4 text-success" />}
                title="No open findings"
                description="All static analysis and automated security scans resolved with zero outstanding issues."
                action={
                  <Button variant="outline">
                    Trigger new scan
                  </Button>
                }
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="h-11 bg-muted/50 border-b border-border hover:bg-muted/50">
                  <TableHead className="w-12 px-4">
                    <Checkbox
                      checked={allSelected ? true : isPartiallySelected ? "indeterminate" : false}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all findings"
                    />
                  </TableHead>
                  <TableHead className="w-28 text-xs font-semibold text-muted-foreground">
                    Severity
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">
                    Finding
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">
                    File
                  </TableHead>
                  <TableHead className="w-28 text-xs font-semibold text-muted-foreground">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockFindings.map((finding) => {
                  const isSelected = selectedIds.has(finding.id);

                  return (
                    <TableRow
                      key={finding.id}
                      data-state={isSelected ? "selected" : undefined}
                      className="h-11 border-b border-border transition-colors hover:bg-muted/40 data-[state=selected]:bg-muted/50"
                    >
                      <TableCell className="px-4">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleRow(finding.id)}
                          aria-label={`Select finding ${finding.id}: ${finding.title}`}
                        />
                      </TableCell>
                      <TableCell>
                        <SeverityBadge severity={finding.severity} />
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">
                            {finding.ruleId}
                          </span>
                          <span className="truncate">{finding.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code
                          className="font-mono text-muted-foreground"
                          style={{ fontSize: "13px" }}
                        >
                          {finding.file}
                        </code>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {finding.status}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex flex-col gap-6">
          <Skeleton className="h-12 w-48" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <DashboardContent />
    </React.Suspense>
  );
}
