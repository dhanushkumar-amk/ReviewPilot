"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircleIcon,
  CheckIcon,
  CopyIcon,
  RefreshCwIcon,
  SearchIcon,
  ShieldAlertIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/app-shell/empty-state";
import { FindingAiAssist } from "@/components/ai/finding-ai-assist";
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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  useFindings,
  useUpdateFindingStatus,
  type FindingItem,
  type FindingSeverity,
  type FindingStatus,
  type FindingTool,
} from "@/src/features/findings/use-findings";
import { useRepositories } from "@/src/features/repositories/use-repositories";

const SEVERITY_BADGES: Record<
  FindingSeverity,
  { label: string; className: string }
> = {
  CRITICAL: { label: "Critical", className: "bg-destructive text-destructive-foreground border-transparent" },
  HIGH: { label: "High", className: "bg-destructive/15 text-destructive border-destructive/20" },
  MEDIUM: { label: "Medium", className: "bg-link/15 text-link border-link/20" },
  LOW: { label: "Low", className: "bg-muted text-muted-foreground border-border" },
  INFO: { label: "Info", className: "bg-muted text-muted-foreground border-border" },
};

const STATUS_DISPLAY: Record<
  FindingStatus,
  { label: string; dotClassName: string }
> = {
  OPEN: { label: "Open", dotClassName: "bg-destructive" },
  ACCEPTED: { label: "Accepted", dotClassName: "bg-link" },
  REJECTED: { label: "Rejected", dotClassName: "bg-muted-foreground" },
  FIXED: { label: "Fixed", dotClassName: "bg-success" },
};

export default function FindingsPage() {
  const [searchInput, setSearchInput] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [severityFilter, setSeverityFilter] = React.useState<FindingSeverity[]>([]);
  const [statusFilter, setStatusFilter] = React.useState<FindingStatus[]>([]);
  const [toolFilter, setToolFilter] = React.useState<FindingTool[]>([]);
  const [repositoryFilter, setRepositoryFilter] = React.useState<string>("ALL");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [cursorHistory, setCursorHistory] = React.useState<string[]>([]);
  const [activeFinding, setActiveFinding] = React.useState<FindingItem | null>(null);
  const [copiedPath, setCopiedPath] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  React.useEffect(() => {
    setCursorHistory([]);
  }, [debouncedSearch, severityFilter, statusFilter, toolFilter, repositoryFilter]);

  const currentCursor = cursorHistory[cursorHistory.length - 1];

  const reposQuery = useRepositories({ status: ["CONNECTED"], limit: 100 });
  const findingsQuery = useFindings({
    cursor: currentCursor,
    limit: 25,
    repositoryId: repositoryFilter === "ALL" ? undefined : repositoryFilter,
    severity: severityFilter.length > 0 ? severityFilter : undefined,
    status: statusFilter.length > 0 ? statusFilter : undefined,
    tool: toolFilter.length > 0 ? toolFilter : undefined,
    search: debouncedSearch || undefined,
  });

  const updateStatusMutation = useUpdateFindingStatus();

  const items = findingsQuery.data?.items ?? [];
  const repos = reposQuery.data?.items ?? [];

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(items.map((i) => i.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleCopyPath = (filePath: string) => {
    navigator.clipboard.writeText(filePath);
    setCopiedPath(true);
    toast.success("Path copied to clipboard");
    setTimeout(() => setCopiedPath(false), 2000);
  };

  const handleStatusChange = async (findingId: string, status: "OPEN" | "ACCEPTED" | "REJECTED") => {
    try {
      await updateStatusMutation.mutateAsync({ findingId, status });
      if (activeFinding && activeFinding.id === findingId) {
        setActiveFinding({ ...activeFinding, status });
      }
      toast.success(`Marked as ${status.toLowerCase()}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const hasActiveFilters =
    debouncedSearch.length > 0 ||
    severityFilter.length > 0 ||
    statusFilter.length > 0 ||
    toolFilter.length > 0 ||
    repositoryFilter !== "ALL";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Findings"
        description="Security, bugs, and secret findings detected across your repositories."
        actions={
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span className="inline-flex cursor-not-allowed" tabIndex={0}>
                      <Button size="sm" disabled>
                        Fix selected
                      </Button>
                    </span>
                  }
                />
                <TooltipContent>
                  Pick one finding and use Draft a fix. Pull requests arrive in a later step.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={findingsQuery.isFetching}
              onClick={() => void findingsQuery.refetch()}
            >
              <RefreshCwIcon data-icon="inline-start" />
              Refresh
            </Button>
          </div>
        }
      />

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
                  placeholder="Search findings, rules, files..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </InputGroup>

              {/* Repository filter */}
              <Select
                value={repositoryFilter}
                onValueChange={(val) => val && setRepositoryFilter(val)}
              >
                <SelectTrigger className="w-full sm:w-56" size="sm">
                  <SelectValue placeholder="All repositories">
                    {(val: string | null) => {
                      if (!val || val === "ALL") return "All repositories";
                      return (
                        repos.find((r) => r.id === val)?.fullName ??
                        "All repositories"
                      );
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="ALL">All repositories</SelectItem>
                    {repos.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.fullName}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Severity filter */}
              <ToggleGroup
                variant="outline"
                size="sm"
                value={severityFilter}
                onValueChange={(vals) => setSeverityFilter(vals as FindingSeverity[])}
              >
                <ToggleGroupItem value="CRITICAL">Critical</ToggleGroupItem>
                <ToggleGroupItem value="HIGH">High</ToggleGroupItem>
                <ToggleGroupItem value="MEDIUM">Medium</ToggleGroupItem>
                <ToggleGroupItem value="LOW">Low</ToggleGroupItem>
              </ToggleGroup>

              {/* Status filter */}
              <ToggleGroup
                variant="outline"
                size="sm"
                value={statusFilter}
                onValueChange={(vals) => setStatusFilter(vals as FindingStatus[])}
              >
                <ToggleGroupItem value="OPEN">Open</ToggleGroupItem>
                <ToggleGroupItem value="ACCEPTED">Accepted</ToggleGroupItem>
                <ToggleGroupItem value="REJECTED">Rejected</ToggleGroupItem>
                <ToggleGroupItem value="FIXED">Fixed</ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          {/* Active Filter Chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t text-xs">
              <span className="text-muted-foreground">Filters:</span>
              {repositoryFilter !== "ALL" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Repo: {repos.find((r) => r.id === repositoryFilter)?.fullName}
                  <XIcon
                    className="size-3 cursor-pointer"
                    onClick={() => setRepositoryFilter("ALL")}
                  />
                </Badge>
              )}
              {severityFilter.map((s) => (
                <Badge key={s} variant="secondary" className="flex items-center gap-1">
                  {s}
                  <XIcon
                    className="size-3 cursor-pointer"
                    onClick={() =>
                      setSeverityFilter(severityFilter.filter((x) => x !== s))
                    }
                  />
                </Badge>
              ))}
              {statusFilter.map((st) => (
                <Badge key={st} variant="secondary" className="flex items-center gap-1">
                  {st}
                  <XIcon
                    className="size-3 cursor-pointer"
                    onClick={() =>
                      setStatusFilter(statusFilter.filter((x) => x !== st))
                    }
                  />
                </Badge>
              ))}
              {debouncedSearch && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  &quot;{debouncedSearch}&quot;
                  <XIcon
                    className="size-3 cursor-pointer"
                    onClick={() => setSearchInput("")}
                  />
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => {
                  setSearchInput("");
                  setSeverityFilter([]);
                  setStatusFilter([]);
                  setToolFilter([]);
                  setRepositoryFilter("ALL");
                }}
              >
                Clear all
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {findingsQuery.isLoading ? (
        <Card>
          <CardHeader className="border-b">
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : findingsQuery.isError ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>Failed to load findings</AlertTitle>
          <AlertDescription>
            {findingsQuery.error?.message || "An unexpected error occurred."}
          </AlertDescription>
          <AlertAction>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void findingsQuery.refetch()}
            >
              Retry
            </Button>
          </AlertAction>
        </Alert>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            {hasActiveFilters ? (
              <div className="flex flex-col items-center gap-3 text-center">
                <span className="text-sm text-muted-foreground">
                  No findings match your current filters.
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchInput("");
                    setSeverityFilter([]);
                    setStatusFilter([]);
                    setToolFilter([]);
                    setRepositoryFilter("ALL");
                  }}
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              <EmptyState
                icon={<ShieldAlertIcon />}
                title="No findings yet"
                description="Push to a connected repository to run a scan and see vulnerabilities or security alerts."
                action={
                  <Button
                    size="sm"
                    render={<Link href="/repositories" />}
                    nativeButton={false}
                  >
                    View repositories
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle>Findings</CardTitle>
              <span className="text-xs text-muted-foreground">
                Showing {items.length} items
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="h-11 border-border">
                  <TableHead className="w-10">
                    <Checkbox
                      checked={
                        selectedIds.size === items.length && items.length > 0
                      }
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Finding</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Tool</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((finding) => {
                  const isChecked = selectedIds.has(finding.id);
                  const sev = SEVERITY_BADGES[finding.severity];
                  const st = STATUS_DISPLAY[finding.status];

                  return (
                    <TableRow
                      key={finding.id}
                      className="h-11 border-border cursor-pointer hover:bg-muted/50"
                      onClick={() => setActiveFinding(finding)}
                    >
                      <TableCell onClick={(e) => handleSelectRow(finding.id, e)}>
                        <Checkbox checked={isChecked} />
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("text-xs font-semibold", sev.className)}
                        >
                          {sev.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm text-foreground">
                            {finding.title}
                          </span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {finding.ruleId}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <span className="font-mono text-xs text-muted-foreground truncate max-w-[200px] block" />
                              }
                            >
                              {finding.filePath}:{finding.startLine}
                            </TooltipTrigger>
                            <TooltipContent>
                              {finding.filePath}:{finding.startLine}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {finding.tool}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 text-xs text-foreground">
                          <span
                            className={cn(
                              "size-2 shrink-0 rounded-full",
                              st.dotClassName,
                            )}
                            aria-hidden="true"
                          />
                          {st.label}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>

          {(cursorHistory.length > 0 || findingsQuery.data?.nextCursor) && (
            <CardFooter className="justify-between border-t">
              <Button
                variant="outline"
                size="sm"
                disabled={cursorHistory.length === 0 || findingsQuery.isFetching}
                onClick={() => setCursorHistory((prev) => prev.slice(0, -1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={
                  !findingsQuery.data?.nextCursor || findingsQuery.isFetching
                }
                onClick={() => {
                  if (findingsQuery.data?.nextCursor) {
                    setCursorHistory((prev) => [
                      ...prev,
                      findingsQuery.data!.nextCursor!,
                    ]);
                  }
                }}
              >
                Next
              </Button>
            </CardFooter>
          )}
        </Card>
      )}

      {/* Finding Details Sheet */}
      <Sheet open={Boolean(activeFinding)} onOpenChange={(open) => !open && setActiveFinding(null)}>
        {activeFinding && (
          <SheetContent className="w-full sm:max-w-lg flex flex-col justify-between overflow-y-auto">
            <div className="flex flex-col gap-6">
              <SheetHeader>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs font-semibold",
                      SEVERITY_BADGES[activeFinding.severity].className,
                    )}
                  >
                    {SEVERITY_BADGES[activeFinding.severity].label}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {activeFinding.tool}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {activeFinding.category}
                  </Badge>
                </div>
                <SheetTitle className="text-lg pt-2">{activeFinding.title}</SheetTitle>
                <SheetDescription className="font-mono text-xs">
                  {activeFinding.ruleId}
                </SheetDescription>
              </SheetHeader>

              {/* File details with copy button */}
              <div className="flex flex-col gap-1.5 p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium">
                    Location
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-xs text-muted-foreground"
                    onClick={() => handleCopyPath(activeFinding.filePath)}
                  >
                    {copiedPath ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
                    Copy path
                  </Button>
                </div>
                <span className="font-mono text-xs break-all">
                  {activeFinding.filePath}:{activeFinding.startLine}
                  {activeFinding.endLine !== activeFinding.startLine &&
                    `-${activeFinding.endLine}`}
                </span>
                <span className="text-xs text-muted-foreground pt-1">
                  Repository: {activeFinding.repository.fullName}
                </span>
              </div>

              {/* Message */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-foreground">Details</span>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {activeFinding.message}
                </p>
              </div>

              {/* Snippet */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-foreground">Code Snippet</span>
                {activeFinding.category === "SECRET" ? (
                  <div className="p-3 rounded-md bg-muted/50 border text-xs text-muted-foreground italic">
                    Secret value hidden for safety
                  </div>
                ) : activeFinding.snippet ? (
                  <pre className="p-3 rounded-md bg-muted font-mono text-xs overflow-x-auto whitespace-pre leading-snug">
                    {activeFinding.snippet}
                  </pre>
                ) : (
                  <div className="p-3 rounded-md bg-muted/30 border text-xs text-muted-foreground">
                    No snippet available
                  </div>
                )}
              </div>

              {/* AI Assist Section */}
              <FindingAiAssist finding={activeFinding} />
            </div>

            {/* Actions footer */}
            <SheetFooter className="border-t pt-4 flex flex-row items-center justify-between sm:justify-between w-full">
              <span className="text-xs text-muted-foreground">
                Status: {STATUS_DISPLAY[activeFinding.status].label}
              </span>
              <div className="flex items-center gap-2">
                {activeFinding.status !== "ACCEPTED" && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={updateStatusMutation.isPending}
                    onClick={() => handleStatusChange(activeFinding.id, "ACCEPTED")}
                  >
                    Accept
                  </Button>
                )}
                {activeFinding.status !== "REJECTED" && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={updateStatusMutation.isPending}
                    onClick={() => handleStatusChange(activeFinding.id, "REJECTED")}
                  >
                    Reject
                  </Button>
                )}
                {activeFinding.status !== "OPEN" && (
                  <Button
                    variant="default"
                    size="sm"
                    disabled={updateStatusMutation.isPending}
                    onClick={() => handleStatusChange(activeFinding.id, "OPEN")}
                  >
                    Reopen
                  </Button>
                )}
              </div>
            </SheetFooter>
          </SheetContent>
        )}
      </Sheet>
    </div>
  );
}
