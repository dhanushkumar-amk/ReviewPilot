"use client";

import * as React from "react";
import Link from "next/link";
import { PageHeader } from "@/components/app-shell/page-header";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldAlertIcon,
  ArrowRightIcon,
  ActivityIcon,
  FolderCodeIcon,
  CheckCircle2Icon,
} from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Overview"
        description="High-level review telemetry, health metrics, and active automated scans."
        actions={
          <Button
            variant="default"
            render={<Link href="/findings" />}
            nativeButton={false}
          >
            <span>Explore findings</span>
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        }
      />

      {/* 4 Stat Cards: rounded-lg, 1px border, 20px padding (p-5), muted subtext line */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Open findings */}
        <Card className="rounded-lg border border-border bg-card p-5 shadow-none flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Open findings
          </span>
          <div className="text-2xl font-semibold leading-8 text-foreground">
            42
          </div>
          <span className="text-xs text-muted-foreground">
            +5 since yesterday
          </span>
        </Card>

        {/* Critical */}
        <Card className="rounded-lg border border-border bg-card p-5 shadow-none flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Critical
          </span>
          <div className="text-2xl font-semibold leading-8 text-destructive">
            3
          </div>
          <span className="text-xs text-muted-foreground">
            Immediate attention needed
          </span>
        </Card>

        {/* Scans today */}
        <Card className="rounded-lg border border-border bg-card p-5 shadow-none flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Scans today
          </span>
          <div className="text-2xl font-semibold leading-8 text-foreground">
            18
          </div>
          <span className="text-xs text-muted-foreground">
            3 scans in progress
          </span>
        </Card>

        {/* Queue lag */}
        <Card className="rounded-lg border border-border bg-card p-5 shadow-none flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Queue lag
          </span>
          <div className="text-2xl font-semibold leading-8 text-success">
            0.4s
          </div>
          <span className="text-xs text-muted-foreground">
            Optimal throughput
          </span>
        </Card>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Findings Summary Card */}
        <Card className="rounded-lg border border-border bg-card shadow-none">
          <CardHeader className="border-b border-border px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <CardTitle className="text-base font-semibold">
                  Findings inventory
                </CardTitle>
                <CardDescription>
                  Breakdown of 42 active diagnostics discovered across all branches.
                </CardDescription>
              </div>
              <ShieldAlertIcon className="text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="p-5 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="flex flex-col rounded-md border border-destructive/20 bg-destructive/10 p-3">
                <span className="text-xs font-medium text-destructive">
                  Critical
                </span>
                <span className="text-xl font-bold text-destructive">3</span>
              </div>
              <div className="flex flex-col rounded-md border border-warning/20 bg-warning/10 p-3">
                <span className="text-xs font-medium text-warning">High</span>
                <span className="text-xl font-bold text-warning">5</span>
              </div>
              <div className="flex flex-col rounded-md border border-border bg-muted p-3">
                <span className="text-xs font-medium text-muted-foreground">
                  Medium
                </span>
                <span className="text-xl font-bold text-foreground">10</span>
              </div>
              <div className="flex flex-col rounded-md border border-border bg-muted p-3">
                <span className="text-xs font-medium text-muted-foreground">
                  Low
                </span>
                <span className="text-xl font-bold text-foreground">24</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground">
                Detailed table view available on Findings tab
              </span>
              <Button
                variant="outline"
                size="sm"
                render={<Link href="/findings" />}
                nativeButton={false}
              >
                <span>View findings table</span>
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* System & Scanner Activity */}
        <Card className="rounded-lg border border-border bg-card shadow-none">
          <CardHeader className="border-b border-border px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <CardTitle className="text-base font-semibold">
                  Scanner status
                </CardTitle>
                <CardDescription>
                  Continuous integration worker pools and repository hooks.
                </CardDescription>
              </div>
              <ActivityIcon className="text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="p-5 flex flex-col gap-4">
            <div className="flex flex-col divide-y divide-border">
              <div className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2.5">
                  <FolderCodeIcon className="text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-foreground">
                      reviewpilot/core
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Main branch • 2m ago
                    </span>
                  </div>
                </div>
                <Badge variant="secondary" className="gap-1 text-[11px]">
                  <CheckCircle2Icon className="size-3 text-success" />
                  Synced
                </Badge>
              </div>

              <div className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2.5">
                  <FolderCodeIcon className="text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-foreground">
                      reviewpilot/worker
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Feature branch #412 • 14m ago
                    </span>
                  </div>
                </div>
                <Badge variant="secondary" className="gap-1 text-[11px]">
                  <CheckCircle2Icon className="size-3 text-success" />
                  Synced
                </Badge>
              </div>

              <div className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2.5">
                  <FolderCodeIcon className="text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-foreground">
                      reviewpilot/web
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Staging preview • 32m ago
                    </span>
                  </div>
                </div>
                <Badge variant="secondary" className="gap-1 text-[11px]">
                  <CheckCircle2Icon className="size-3 text-success" />
                  Synced
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground">
                All 4 connected repositories active
              </span>
              <Button
                variant="outline"
                size="sm"
                render={<Link href="/scans" />}
                nativeButton={false}
              >
                <span>View scan history</span>
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
