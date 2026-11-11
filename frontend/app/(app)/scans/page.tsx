"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import {
  ActivityIcon,
  CheckCircle2Icon,
  ClockIcon,
  PlayIcon,
  RefreshCwIcon,
  TerminalIcon,
  XCircleIcon,
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
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockTitle,
} from "@/components/ui/code-block";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  initialRepositories,
  initialScanRuns,
  scanActivityChartData,
  type ScanRunRecord,
} from "@/lib/dashboard-data";

const scanChartConfig = {
  reviews: {
    label: "Scans executed",
    color: "var(--primary)",
  },
  findings: {
    label: "Issues detected",
    color: "var(--destructive)",
  },
} satisfies ChartConfig;

const repoSelectItems = initialRepositories.map((repo) => ({
  label: repo.fullName,
  value: repo.fullName,
}));

function statusVariant(
  status: ScanRunRecord["status"]
): React.ComponentProps<typeof Badge>["variant"] {
  if (status === "Completed") return "success";
  if (status === "Failed") return "destructive";
  if (status === "Running") return "default";
  return "secondary";
}

export default function ScansPage() {
  const [runs, setRuns] = React.useState<ScanRunRecord[]>(initialScanRuns);
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [selectedRun, setSelectedRun] = React.useState<ScanRunRecord | null>(
    null
  );

  const [triggerOpen, setTriggerOpen] = React.useState(false);
  const [targetRepo, setTargetRepo] = React.useState(
    initialRepositories[0]?.fullName ?? "reviewpilot/core"
  );
  const [targetBranch, setTargetBranch] = React.useState("main");

  const filteredRuns = runs.filter(
    (run) => statusFilter === "all" || run.status === statusFilter
  );

  const handleStartManualScan = (event: React.FormEvent) => {
    event.preventDefault();
    const idNum = 8945 + runs.length - initialScanRuns.length;
    const nextRun: ScanRunRecord = {
      id: `SCN-${idNum}`,
      repository: targetRepo,
      branch: targetBranch.trim() || "main",
      commitSha: "f3a81c0",
      trigger: "Manual",
      status: "Running",
      duration: "0m 04s",
      filesScanned: 64,
      findingsCount: 0,
      startedAt: "Just now",
      steps: [
        {
          name: "Checkout shallow diff",
          duration: "1.2s",
          status: "Completed",
          detail: `Cloned ${targetRepo} (${targetBranch.trim() || "main"})`,
        },
        {
          name: "AST + taint graph analysis",
          duration: "2.8s",
          status: "Running",
          detail: "Running Inngest worker job scan-repository...",
        },
      ],
    };
    setRuns((prev) => [nextRun, ...prev]);
    setTriggerOpen(false);
    toast.success(`Started ${nextRun.id} on ${nextRun.repository}`);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Scans"
        description="Inspect automated Inngest scan executions, worker latency, and step-by-step analyzer diagnostics."
        actions={
          <Dialog open={triggerOpen} onOpenChange={setTriggerOpen}>
            <DialogTrigger render={<Button />}>
              <PlayIcon data-icon="inline-start" />
              Run manual scan
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <form
                onSubmit={handleStartManualScan}
                className="flex flex-col gap-4"
              >
                <DialogHeader>
                  <DialogTitle>Trigger manual scan</DialogTitle>
                  <DialogDescription>
                    Dispatch an immediate security and code quality sweep via
                    Inngest workers.
                  </DialogDescription>
                </DialogHeader>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="scan-repo">Repository</FieldLabel>
                    <Select
                      items={repoSelectItems}
                      value={targetRepo}
                      onValueChange={(value) => {
                        if (value) setTargetRepo(value);
                      }}
                    >
                      <SelectTrigger id="scan-repo" className="w-full">
                        <SelectValue placeholder="Choose repository" />
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        <SelectGroup>
                          {repoSelectItems.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="scan-branch">Branch or tag</FieldLabel>
                    <Input
                      id="scan-branch"
                      value={targetBranch}
                      onChange={(e) => setTargetBranch(e.target.value)}
                    />
                  </Field>
                </FieldGroup>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setTriggerOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Dispatch scan job</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Scans (24h)"
          value={runs.length * 9}
          description={`${runs.filter((r) => r.status === "Running").length} actively executing in queue`}
          icon={ActivityIcon}
        />
        <StatCard
          title="Median scan time"
          value="54s"
          description="Across incremental pull request diffs"
          icon={ClockIcon}
        />
        <StatCard
          title="Pipeline pass rate"
          value="96.8%"
          valueClassName="text-success"
          description="Inngest cloud workers operational"
          badge={{ label: "Healthy", variant: "success" }}
        />
      </div>

      {/* Throughput Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily scan throughput</CardTitle>
          <CardDescription>
            Automated analyzer runs versus surfaced code issues over the past 11
            days
          </CardDescription>
          <CardAction>
            <Badge variant="outline">Inngest queue</Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <ChartContainer config={scanChartConfig} className="h-[220px] w-full">
            <BarChart
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
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="reviews"
                fill="var(--color-reviews)"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="findings"
                fill="var(--color-findings)"
                radius={[4, 4, 0, 0]}
              />
              <ChartLegend content={<ChartLegendContent />} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Scan Runs Table */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <CardTitle>Recent scan executions</CardTitle>
              <CardDescription>
                Select any run to inspect step timings and analyzer output
              </CardDescription>
            </div>
            <ToggleGroup
              variant="outline"
              size="sm"
              value={[statusFilter]}
              onValueChange={(next) => {
                if (next[0]) setStatusFilter(next[0]);
              }}
            >
              <ToggleGroupItem value="all">All</ToggleGroupItem>
              <ToggleGroupItem value="Running">Running</ToggleGroupItem>
              <ToggleGroupItem value="Completed">Completed</ToggleGroupItem>
              <ToggleGroupItem value="Failed">Failed</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Run ID</TableHead>
                <TableHead>Repository & branch</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Findings</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRuns.map((run) => (
                <TableRow
                  key={run.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedRun(run)}
                >
                  <TableCell className="font-mono text-xs font-medium">
                    {run.id}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-mono text-xs font-medium text-foreground">
                        {run.repository}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {run.branch} · {run.commitSha}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{run.trigger}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(run.status)}>
                      {run.status === "Running" ? <Spinner /> : null}
                      {run.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {run.duration}
                  </TableCell>
                  <TableCell className="font-mono text-sm tabular-nums">
                    {run.findingsCount}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRun(run);
                      }}
                    >
                      <TerminalIcon data-icon="inline-start" />
                      Trace
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Run Trace Sheet */}
      <Sheet
        open={Boolean(selectedRun)}
        onOpenChange={(open) => {
          if (!open) setSelectedRun(null);
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col">
          {selectedRun ? (
            <>
              <SheetHeader className="border-b">
                <div className="flex items-center gap-2">
                  <Badge variant={statusVariant(selectedRun.status)}>
                    {selectedRun.status}
                  </Badge>
                  <span className="font-mono text-xs text-muted-foreground">
                    {selectedRun.id} · {selectedRun.startedAt}
                  </span>
                </div>
                <SheetTitle className="font-mono">
                  {selectedRun.repository}
                </SheetTitle>
                <SheetDescription className="font-mono">
                  {selectedRun.branch} ({selectedRun.commitSha}) ·{" "}
                  {selectedRun.filesScanned} files scanned
                </SheetDescription>
              </SheetHeader>

              <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Execution steps
                  </span>
                  {selectedRun.steps.map((step) => (
                    <div
                      key={step.name}
                      className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {step.status === "Completed" ? (
                            <CheckCircle2Icon className="size-4 text-success" />
                          ) : step.status === "Failed" ? (
                            <XCircleIcon className="size-4 text-destructive" />
                          ) : (
                            <Spinner />
                          )}
                          <span className="text-sm font-medium text-foreground">
                            {step.name}
                          </span>
                        </div>
                        <span className="font-mono text-xs text-muted-foreground">
                          {step.duration}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {step.detail}
                      </p>
                    </div>
                  ))}
                </div>

                <CodeBlock size="sm">
                  <CodeBlockHeader>
                    <CodeBlockTitle>Worker telemetry log</CodeBlockTitle>
                    <CodeBlockActions>
                      <CodeBlockCopyButton
                        value={`[${selectedRun.id}] repo=${selectedRun.repository} sha=${selectedRun.commitSha} status=${selectedRun.status}`}
                      />
                    </CodeBlockActions>
                  </CodeBlockHeader>
                  <CodeBlockContent lineNumbers>
                    {`[inngest] job=${selectedRun.id} trigger="${selectedRun.trigger}"
[git] checkout ${selectedRun.repository}@${selectedRun.commitSha} (${selectedRun.filesScanned} files)
[engine] evaluated AST + CWE rules in ${selectedRun.duration}
[result] status=${selectedRun.status} findings=${selectedRun.findingsCount}`}
                  </CodeBlockContent>
                </CodeBlock>
              </div>

              <SheetFooter className="border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    toast.success(`Re-queued scan for ${selectedRun.repository}`);
                    setSelectedRun(null);
                  }}
                >
                  <RefreshCwIcon data-icon="inline-start" />
                  Re-run scan
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
