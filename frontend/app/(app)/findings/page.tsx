"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
  type ColumnDef,
  flexRender,
} from "@tanstack/react-table";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/app-shell/empty-state";
import { MarkdownView } from "@/components/markdown-view";
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
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Alert } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  mockFindings,
  type Finding,
  type Severity,
  type FindingStatus,
} from "@/lib/mock-data";
import { cn } from "cn";
import {
  WrenchIcon,
  ShieldCheckIcon,
  ShieldAlertIcon,
  SearchIcon,
  DownloadIcon,
  SlidersHorizontalIcon,
  ColumnsIcon,
  ChevronDownIcon,
  MoreHorizontalIcon,
  CopyIcon,
  CheckIcon,
  XIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  CheckCircle2Icon,
  XCircleIcon,
} from "lucide-react";

// Severity Badge with uniform size, shape, and semantic opacity tokens
function SeverityBadge({ severity }: { severity: Severity }) {
  const baseClasses =
    "inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-medium min-w-[64px] border";
  switch (severity) {
    case "Critical":
      return (
        <span
          className={cn(
            baseClasses,
            "border-destructive/20 bg-destructive/15 text-destructive"
          )}
        >
          Critical
        </span>
      );
    case "High":
      return (
        <span
          className={cn(
            baseClasses,
            "border-warning/20 bg-warning/15 text-warning"
          )}
        >
          High
        </span>
      );
    case "Medium":
      return (
        <span
          className={cn(
            baseClasses,
            "border-border bg-muted text-muted-foreground"
          )}
        >
          Medium
        </span>
      );
    case "Low":
      return (
        <span
          className={cn(
            baseClasses,
            "border-border bg-transparent text-muted-foreground"
          )}
        >
          Low
        </span>
      );
  }
}

// Status definition: 8px dot + text + semantic token + descriptive tooltip
const statusConfig: Record<
  FindingStatus,
  { dotClass: string; tooltip: string }
> = {
  Open: {
    dotClass: "bg-destructive",
    tooltip: "Open finding requiring review and remediation",
  },
  Triaged: {
    dotClass: "bg-warning",
    tooltip: "Finding acknowledged and scheduled for upcoming sprint",
  },
  "In progress": {
    dotClass: "bg-link",
    tooltip: "Active remediation pull request currently under review",
  },
  Fixed: {
    dotClass: "bg-success",
    tooltip: "Remediated in codebase and verified by automated scanner",
  },
};

function StatusIndicator({ status }: { status: FindingStatus }) {
  const config = statusConfig[status];

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className="inline-flex items-center gap-1.5 cursor-help"
            tabIndex={0}
          />
        }
        nativeButton={false}
      >
        <span
          className={cn("size-2 rounded-full shrink-0", config.dotClass)}
          aria-hidden="true"
        />
        <span className="text-xs text-foreground font-medium">{status}</span>
      </TooltipTrigger>
      <TooltipContent>{config.tooltip}</TooltipContent>
    </Tooltip>
  );
}

const pageSizeItems = [
  { label: "10", value: 10 },
  { label: "25", value: 25 },
  { label: "50", value: 50 },
];

function FindingsContent() {
  const searchParams = useSearchParams();
  const stateParam = searchParams.get("state");
  const isLoading = stateParam === "loading";
  const isEmpty = stateParam === "empty";

  // Banner dismiss local state
  const [bannerDismissed, setBannerDismissed] = React.useState(false);

  // Filters state
  const [searchQuery, setSearchQuery] = React.useState("");
  const [severityFilter, setSeverityFilter] = React.useState<Set<Severity>>(
    new Set()
  );
  const [statusFilter, setStatusFilter] = React.useState<Set<FindingStatus>>(
    new Set()
  );
  const [repoFilter, setRepoFilter] = React.useState<Set<string>>(new Set());

  // Table state
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
    select: true,
    severity: true,
    title: true,
    file: true,
    status: true,
    actions: true,
  });
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // Detail Sheet state
  const [selectedFinding, setSelectedFinding] = React.useState<Finding | null>(
    null
  );
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [copiedFile, setCopiedFile] = React.useState(false);

  // Available repositories from mock findings
  const allRepositories = React.useMemo(() => {
    return Array.from(new Set(mockFindings.map((f) => f.repository))).sort();
  }, []);

  // Filtered dataset
  const filteredFindings = React.useMemo(() => {
    if (isEmpty) return [];
    return mockFindings.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          item.title.toLowerCase().includes(q) ||
          item.file.toLowerCase().includes(q) ||
          item.ruleId.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q) ||
          item.repository.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (severityFilter.size > 0 && !severityFilter.has(item.severity)) {
        return false;
      }
      if (statusFilter.size > 0 && !statusFilter.has(item.status)) {
        return false;
      }
      if (repoFilter.size > 0 && !repoFilter.has(item.repository)) {
        return false;
      }
      return true;
    });
  }, [isEmpty, searchQuery, severityFilter, statusFilter, repoFilter]);

  const handleCopyPath = (filePath: string) => {
    navigator.clipboard.writeText(filePath);
    setCopiedFile(true);
    setTimeout(() => setCopiedFile(false), 2000);
  };

  const handleOpenDetail = (finding: Finding) => {
    setSelectedFinding(finding);
    setSheetOpen(true);
  };

  const handleClearAllFilters = () => {
    setSearchQuery("");
    setSeverityFilter(new Set());
    setStatusFilter(new Set());
    setRepoFilter(new Set());
  };

  const handleViewCritical = () => {
    setSeverityFilter(new Set(["Critical"]));
    setSearchQuery("");
    setStatusFilter(new Set());
    setRepoFilter(new Set());
  };

  const toggleSeverity = (val: Severity) => {
    setSeverityFilter((prev) => {
      const next = new Set(prev);
      if (next.has(val)) next.delete(val);
      else next.add(val);
      return next;
    });
  };

  const toggleStatus = (val: FindingStatus) => {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(val)) next.delete(val);
      else next.add(val);
      return next;
    });
  };

  const toggleRepo = (val: string) => {
    setRepoFilter((prev) => {
      const next = new Set(prev);
      if (next.has(val)) next.delete(val);
      else next.add(val);
      return next;
    });
  };

  const columns = React.useMemo<ColumnDef<Finding>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={table.getIsAllPageRowsSelected()}
              indeterminate={table.getIsSomePageRowsSelected()}
              onCheckedChange={(val) => table.toggleAllPageRowsSelected(!!val)}
              aria-label="Select all findings on current page"
            />
          </div>
        ),
        cell: ({ row }) => (
          <div
            className="flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(val) => row.toggleSelected(!!val)}
              aria-label={`Select finding ${row.original.id}`}
            />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "severity",
        header: ({ column }) => {
          const sorted = column.getIsSorted();
          return (
            <button
              type="button"
              className="flex items-center gap-1 font-semibold text-xs text-muted-foreground hover:text-foreground cursor-pointer select-none outline-none focus-visible:ring-1 focus-visible:ring-ring"
              onClick={column.getToggleSortingHandler()}
              aria-sort={
                sorted === "asc"
                  ? "ascending"
                  : sorted === "desc"
                  ? "descending"
                  : "none"
              }
            >
              <span>Severity</span>
              {sorted === "asc" ? (
                <ArrowUpIcon className="size-3 text-foreground" />
              ) : sorted === "desc" ? (
                <ArrowDownIcon className="size-3 text-foreground" />
              ) : (
                <ArrowUpDownIcon className="size-3 opacity-40" />
              )}
            </button>
          );
        },
        cell: ({ row }) => <SeverityBadge severity={row.original.severity} />,
      },
      {
        accessorKey: "title",
        header: ({ column }) => {
          const sorted = column.getIsSorted();
          return (
            <button
              type="button"
              className="flex items-center gap-1 font-semibold text-xs text-muted-foreground hover:text-foreground cursor-pointer select-none outline-none focus-visible:ring-1 focus-visible:ring-ring"
              onClick={column.getToggleSortingHandler()}
              aria-sort={
                sorted === "asc"
                  ? "ascending"
                  : sorted === "desc"
                  ? "descending"
                  : "none"
              }
            >
              <span>Finding</span>
              {sorted === "asc" ? (
                <ArrowUpIcon className="size-3 text-foreground" />
              ) : sorted === "desc" ? (
                <ArrowDownIcon className="size-3 text-foreground" />
              ) : (
                <ArrowUpDownIcon className="size-3 opacity-40" />
              )}
            </button>
          );
        },
        cell: ({ row }) => (
          <div className="flex items-center gap-2 max-w-md truncate">
            <span className="font-mono text-xs text-muted-foreground shrink-0">
              {row.original.ruleId}
            </span>
            <span className="truncate font-medium text-foreground">
              {row.original.title}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "file",
        header: ({ column }) => {
          const sorted = column.getIsSorted();
          return (
            <button
              type="button"
              className="flex items-center gap-1 font-semibold text-xs text-muted-foreground hover:text-foreground cursor-pointer select-none outline-none focus-visible:ring-1 focus-visible:ring-ring"
              onClick={column.getToggleSortingHandler()}
              aria-sort={
                sorted === "asc"
                  ? "ascending"
                  : sorted === "desc"
                  ? "descending"
                  : "none"
              }
            >
              <span>File</span>
              {sorted === "asc" ? (
                <ArrowUpIcon className="size-3 text-foreground" />
              ) : sorted === "desc" ? (
                <ArrowDownIcon className="size-3 text-foreground" />
              ) : (
                <ArrowUpDownIcon className="size-3 opacity-40" />
              )}
            </button>
          );
        },
        cell: ({ row }) => (
          <code
            className="font-mono text-xs text-muted-foreground truncate block max-w-xs"
            title={row.original.file}
          >
            {row.original.file}
          </code>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => {
          const sorted = column.getIsSorted();
          return (
            <button
              type="button"
              className="flex items-center gap-1 font-semibold text-xs text-muted-foreground hover:text-foreground cursor-pointer select-none outline-none focus-visible:ring-1 focus-visible:ring-ring"
              onClick={column.getToggleSortingHandler()}
              aria-sort={
                sorted === "asc"
                  ? "ascending"
                  : sorted === "desc"
                  ? "descending"
                  : "none"
              }
            >
              <span>Status</span>
              {sorted === "asc" ? (
                <ArrowUpIcon className="size-3 text-foreground" />
              ) : sorted === "desc" ? (
                <ArrowDownIcon className="size-3 text-foreground" />
              ) : (
                <ArrowUpDownIcon className="size-3 opacity-40" />
              )}
            </button>
          );
        },
        cell: ({ row }) => <StatusIndicator status={row.original.status} />,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div
            className="flex items-center justify-end"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label="Row actions"
                        />
                      }
                    />
                  }
                >
                  <MoreHorizontalIcon />
                </TooltipTrigger>
                <TooltipContent>Row actions</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => handleOpenDetail(row.original)}
                    className="cursor-pointer"
                  >
                    <EyeIcon data-icon="inline-start" />
                    <span>View details</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleCopyPath(row.original.file)}
                    className="cursor-pointer"
                  >
                    <CopyIcon data-icon="inline-start" />
                    <span>Copy file path</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem className="cursor-pointer">
                    <CheckCircle2Icon data-icon="inline-start" />
                    <span>Accept</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    className="cursor-pointer"
                  >
                    <XCircleIcon data-icon="inline-start" />
                    <span>Reject</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ],
    []
  );

  const table = useReactTable({
    data: filteredFindings,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection: true,
    getRowId: (row) => row.id,
  });

  const selectedCount = Object.keys(rowSelection).length;
  const totalFindingsCount = mockFindings.length;
  const filteredCount = filteredFindings.length;
  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    severityFilter.size > 0 ||
    statusFilter.size > 0 ||
    repoFilter.size > 0;

  // Pagination calculation
  const pageIndex = pagination.pageIndex;
  const pageSize = pagination.pageSize;
  const startItem = filteredCount === 0 ? 0 : pageIndex * pageSize + 1;
  const endItem = Math.min((pageIndex + 1) * pageSize, filteredCount);

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header with Underline-style Tabs: Overview, Scans, Rules, Settings */}
      <PageHeader
        title="Findings"
        description="Comprehensive inventory of triaged and outstanding review diagnostics."
        actions={
          // When rows are selected, the primary action is in the bulk action bar to avoid button duplication
          selectedCount === 0 ? (
            <Button
              variant="default"
              disabled={isLoading || isEmpty}
              aria-label="Fix selected (0)"
            >
              <WrenchIcon data-icon="inline-start" />
              <span>Fix selected (0)</span>
            </Button>
          ) : null
        }
      />

      {/* Info Banner: Dismissible Alert above stat cards */}
      {!bannerDismissed && !isLoading && !isEmpty && (
        <Alert className="flex items-center justify-between rounded-lg border border-border bg-card p-3 shadow-none">
          <div className="flex items-center gap-2.5">
            <ShieldAlertIcon className="text-destructive" />
            <span className="text-sm font-medium text-foreground">
              3 critical findings need attention.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleViewCritical}>
              View critical
            </Button>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setBannerDismissed(true)}
                    aria-label="Dismiss banner"
                  />
                }
              >
                <XIcon />
              </TooltipTrigger>
              <TooltipContent>Dismiss</TooltipContent>
            </Tooltip>
          </div>
        </Alert>
      )}

      {/* 4 Stat Cards: rounded-lg, 1px border, 20px padding (p-5), muted subtext line */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Open findings */}
        <Card className="rounded-lg border border-border bg-card p-5 shadow-none flex flex-col gap-1">
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
          <span className="text-xs text-muted-foreground">
            +5 since yesterday
          </span>
        </Card>

        {/* Critical */}
        <Card className="rounded-lg border border-border bg-card p-5 shadow-none flex flex-col gap-1">
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
          <span className="text-xs text-muted-foreground">
            Unchanged
          </span>
        </Card>

        {/* Scans today */}
        <Card className="rounded-lg border border-border bg-card p-5 shadow-none flex flex-col gap-1">
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
          <span className="text-xs text-muted-foreground">
            3 in progress
          </span>
        </Card>

        {/* Queue lag */}
        <Card className="rounded-lg border border-border bg-card p-5 shadow-none flex flex-col gap-1">
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
          <span className="text-xs text-muted-foreground">
            Optimal performance
          </span>
        </Card>
      </div>

      {/* Main Table Card (rounded-lg, 1px border, no shadow) */}
      <Card className="rounded-lg border border-border bg-card shadow-none overflow-hidden">
        {/* Table Card Header: Title & description left, Export button right */}
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
            <Button
              variant="outline"
              size="sm"
              disabled={isLoading || isEmpty}
              aria-label="Export findings"
            >
              <DownloadIcon data-icon="inline-start" />
              <span>Export</span>
            </Button>
          </div>
        </CardHeader>

        {/* Bulk Action Bar (E): Shown when rows are selected */}
        {!isLoading && !isEmpty && selectedCount > 0 && (
          <div className="flex items-center justify-between border-b border-border bg-muted/40 px-5 py-2.5">
            <span className="text-xs font-medium text-foreground">
              {selectedCount} selected
            </span>
            <div className="flex items-center gap-2">
              {/* Single Primary Action per screen */}
              <Button
                variant="default"
                size="sm"
                aria-label={`Fix selected (${selectedCount})`}
              >
                <WrenchIcon data-icon="inline-start" />
                <span>Fix selected ({selectedCount})</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRowSelection({})}
              >
                Reject
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRowSelection({})}
              >
                Clear selection
              </Button>
            </div>
          </div>
        )}

        {/* Table Toolbar (C): Inside the card above the table */}
        <div className="border-b border-border p-4 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search Input and Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Search with accessible label */}
              <div className="relative w-full sm:w-64">
                <label htmlFor="findings-search" className="sr-only">
                  Search findings
                </label>
                <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="findings-search"
                  type="search"
                  placeholder="Search findings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs rounded-lg"
                  disabled={isLoading || isEmpty}
                />
              </div>

              {/* Severity Filter Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isLoading || isEmpty}
                      className="gap-1.5"
                    />
                  }
                >
                  <SlidersHorizontalIcon />
                  <span>Severity</span>
                  {severityFilter.size > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-0.5 size-4 p-0 justify-center text-[10px]"
                    >
                      {severityFilter.size}
                    </Badge>
                  )}
                  <ChevronDownIcon />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-40">
                  <DropdownMenuLabel>Filter by severity</DropdownMenuLabel>
                  <DropdownMenuGroup>
                    {(["Critical", "High", "Medium", "Low"] as Severity[]).map(
                      (sev) => (
                        <DropdownMenuCheckboxItem
                          key={sev}
                          checked={severityFilter.has(sev)}
                          onCheckedChange={() => toggleSeverity(sev)}
                        >
                          {sev}
                        </DropdownMenuCheckboxItem>
                      )
                    )}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Status Filter Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isLoading || isEmpty}
                      className="gap-1.5"
                    />
                  }
                >
                  <span>Status</span>
                  {statusFilter.size > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-0.5 size-4 p-0 justify-center text-[10px]"
                    >
                      {statusFilter.size}
                    </Badge>
                  )}
                  <ChevronDownIcon />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-40">
                  <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
                  <DropdownMenuGroup>
                    {(["Open", "Triaged", "In progress", "Fixed"] as FindingStatus[]).map(
                      (stat) => (
                        <DropdownMenuCheckboxItem
                          key={stat}
                          checked={statusFilter.has(stat)}
                          onCheckedChange={() => toggleStatus(stat)}
                        >
                          {stat}
                        </DropdownMenuCheckboxItem>
                      )
                    )}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Repository Filter Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isLoading || isEmpty}
                      className="gap-1.5"
                    />
                  }
                >
                  <span>Repository</span>
                  {repoFilter.size > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-0.5 size-4 p-0 justify-center text-[10px]"
                    >
                      {repoFilter.size}
                    </Badge>
                  )}
                  <ChevronDownIcon />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52">
                  <DropdownMenuLabel>Filter by repository</DropdownMenuLabel>
                  <DropdownMenuGroup>
                    {allRepositories.map((repo) => (
                      <DropdownMenuCheckboxItem
                        key={repo}
                        checked={repoFilter.has(repo)}
                        onCheckedChange={() => toggleRepo(repo)}
                      >
                        {repo}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Columns Visibility Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isLoading || isEmpty}
                      className="gap-1.5"
                    />
                  }
                >
                  <ColumnsIcon />
                  <span>Columns</span>
                  <ChevronDownIcon />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-40">
                  <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                  <DropdownMenuGroup>
                    {table
                      .getAllColumns()
                      .filter((col) => col.getCanHide())
                      .map((col) => {
                        const colLabels: Record<string, string> = {
                          severity: "Severity",
                          title: "Finding",
                          file: "File",
                          status: "Status",
                        };
                        return (
                          <DropdownMenuCheckboxItem
                            key={col.id}
                            checked={col.getIsVisible()}
                            onCheckedChange={(checked) =>
                              col.toggleVisibility(!!checked)
                            }
                          >
                            {colLabels[col.id] ?? col.id}
                          </DropdownMenuCheckboxItem>
                        );
                      })}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Result count on the right */}
            <div className="flex items-center justify-end text-xs text-muted-foreground whitespace-nowrap">
              {isLoading ? (
                <Skeleton className="h-4 w-20" />
              ) : isEmpty ? (
                "0 findings"
              ) : hasActiveFilters ? (
                `${filteredCount} of ${totalFindingsCount} findings`
              ) : (
                `${totalFindingsCount} findings`
              )}
            </div>
          </div>

          {/* Removable Filter Chips below toolbar */}
          {!isLoading && !isEmpty && hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {searchQuery.trim() && (
                <Badge
                  variant="secondary"
                  className="gap-1 pr-1 pl-2 text-xs font-normal"
                >
                  <span>Query: &ldquo;{searchQuery}&rdquo;</span>
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="rounded-full hover:bg-muted p-0.5 outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                    aria-label="Remove search query filter"
                  >
                    <XIcon className="size-3" />
                  </button>
                </Badge>
              )}

              {Array.from(severityFilter).map((sev) => (
                <Badge
                  key={sev}
                  variant="secondary"
                  className="gap-1 pr-1 pl-2 text-xs font-normal"
                >
                  <span>Severity: {sev}</span>
                  <button
                    type="button"
                    onClick={() => toggleSeverity(sev)}
                    className="rounded-full hover:bg-muted p-0.5 outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                    aria-label={`Remove ${sev} severity filter`}
                  >
                    <XIcon className="size-3" />
                  </button>
                </Badge>
              ))}

              {Array.from(statusFilter).map((stat) => (
                <Badge
                  key={stat}
                  variant="secondary"
                  className="gap-1 pr-1 pl-2 text-xs font-normal"
                >
                  <span>Status: {stat}</span>
                  <button
                    type="button"
                    onClick={() => toggleStatus(stat)}
                    className="rounded-full hover:bg-muted p-0.5 outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                    aria-label={`Remove ${stat} status filter`}
                  >
                    <XIcon className="size-3" />
                  </button>
                </Badge>
              ))}

              {Array.from(repoFilter).map((repo) => (
                <Badge
                  key={repo}
                  variant="secondary"
                  className="gap-1 pr-1 pl-2 text-xs font-normal"
                >
                  <span>Repo: {repo}</span>
                  <button
                    type="button"
                    onClick={() => toggleRepo(repo)}
                    className="rounded-full hover:bg-muted p-0.5 outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                    aria-label={`Remove ${repo} repository filter`}
                  >
                    <XIcon className="size-3" />
                  </button>
                </Badge>
              ))}

              <button
                type="button"
                onClick={handleClearAllFilters}
                className="text-xs text-muted-foreground hover:text-foreground font-medium underline underline-offset-2 ml-1 cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Card Content: Table / Skeletons / Empty State */}
        <CardContent className="p-0">
          {isLoading ? (
            /* Skeleton Loading State keeping table layout and 44px rows */
            <div className="flex flex-col divide-y divide-border">
              <div className="flex h-11 items-center bg-muted/50 px-4 gap-4">
                <Skeleton className="size-4" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="ml-auto size-4" />
              </div>
              {Array.from({ length: 8 }).map((_, idx) => (
                <div key={idx} className="flex h-11 items-center px-4 gap-4">
                  <Skeleton className="size-4" />
                  <Skeleton className="h-5 w-16 rounded-md" />
                  <Skeleton className="h-4 w-60" />
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="ml-auto size-4" />
                </div>
              ))}
            </div>
          ) : isEmpty ? (
            /* Empty State (no findings yet) */
            <div className="p-8">
              <EmptyState
                icon={<ShieldCheckIcon className="size-7 text-muted-foreground" />}
                title="No findings yet"
                description="Connect your repository to start scanning pull requests and commits."
                action={
                  <Button variant="outline">
                    Connect repository
                  </Button>
                }
              />
            </div>
          ) : filteredCount === 0 ? (
            /* Filter produced no results */
            <div className="flex flex-col items-center justify-center p-12 gap-2 text-center">
              <span className="text-sm font-semibold text-foreground">
                No findings match your filters
              </span>
              <p className="text-xs text-muted-foreground max-w-sm">
                No diagnostic records match the selected severity, status, repository, or search terms.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAllFilters}
                className="mt-2"
              >
                Clear filters
              </Button>
            </div>
          ) : (
            /* Table with sortable headers, 44px rows, hairline dividers, no zebra */
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow
                    key={headerGroup.id}
                    className="h-11 bg-muted/50 border-b border-border hover:bg-muted/50"
                  >
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className={cn(
                          "px-4 text-xs font-semibold text-muted-foreground",
                          header.id === "select" && "w-12 text-center",
                          header.id === "severity" && "w-28",
                          header.id === "status" && "w-32",
                          header.id === "actions" && "w-12 text-right"
                        )}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => {
                  const isSelected = row.getIsSelected();

                  return (
                    <TableRow
                      key={row.id}
                      data-state={isSelected ? "selected" : undefined}
                      onClick={() => handleOpenDetail(row.original)}
                      className="h-11 border-b border-border transition-colors hover:bg-muted/40 cursor-pointer data-[state=selected]:bg-muted/50"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            "px-4 py-0 align-middle",
                            cell.column.id === "select" && "text-center",
                            cell.column.id === "actions" && "text-right"
                          )}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* Pagination Footer (D) */}
          {!isLoading && !isEmpty && filteredCount > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-border px-5 py-3 gap-3">
              {/* Rows per page select */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Rows per page</span>
                <Select
                  items={pageSizeItems}
                  value={pageSize}
                  onValueChange={(val) => {
                    if (val) table.setPageSize(Number(val));
                  }}
                >
                  <SelectTrigger
                    className="w-18 h-7 text-xs rounded-md"
                    aria-label="Select rows per page"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {pageSizeItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {/* 1 to 10 of 42 text & Previous/Next pagination buttons */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>
                  {startItem} to {endItem} of {filteredCount}
                </span>
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="outline"
                          size="icon-xs"
                          onClick={() => table.previousPage()}
                          disabled={!table.getCanPreviousPage()}
                          aria-label="Previous page"
                        />
                      }
                    >
                      <ChevronLeftIcon />
                    </TooltipTrigger>
                    <TooltipContent>Previous page</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="outline"
                          size="icon-xs"
                          onClick={() => table.nextPage()}
                          disabled={!table.getCanNextPage()}
                          aria-label="Next page"
                        />
                      }
                    >
                      <ChevronRightIcon />
                    </TooltipTrigger>
                    <TooltipContent>Next page</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Sheet Panel (F) */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="sm:max-w-md w-full flex flex-col p-0 gap-0"
        >
          {selectedFinding && (
            <>
              {/* Sheet Header with title, severity badge, status, file path */}
              <SheetHeader className="border-b border-border p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={selectedFinding.severity} />
                    <StatusIndicator status={selectedFinding.status} />
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">
                    {selectedFinding.id}
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <SheetTitle className="text-base font-semibold text-foreground leading-snug">
                    {selectedFinding.title}
                  </SheetTitle>
                  <SheetDescription className="sr-only">
                    Detailed analysis and code remediation for finding {selectedFinding.id}
                  </SheetDescription>
                </div>

                {/* File path box with copy button */}
                <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/50 px-2.5 py-1.5 font-mono text-xs text-muted-foreground">
                  <span className="truncate" title={selectedFinding.file}>
                    {selectedFinding.file}
                  </span>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleCopyPath(selectedFinding.file)}
                          aria-label="Copy file path"
                        />
                      }
                    >
                      {copiedFile ? (
                        <CheckIcon className="text-success" />
                      ) : (
                        <CopyIcon />
                      )}
                    </TooltipTrigger>
                    <TooltipContent>
                      {copiedFile ? "Copied!" : "Copy path"}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </SheetHeader>

              {/* Sheet Body: Why it matters markdown view */}
              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
                <span className="text-xs font-semibold tracking-tight text-foreground uppercase">
                  Why it matters
                </span>
                <div className="rounded-md border border-border bg-card p-4">
                  <MarkdownView>{selectedFinding.description}</MarkdownView>
                </div>

                <div className="flex flex-col gap-1 text-xs text-muted-foreground pt-2">
                  <div className="flex items-center justify-between py-1 border-b border-border">
                    <span>Repository</span>
                    <span className="font-mono text-foreground font-medium">
                      {selectedFinding.repository}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-border">
                    <span>Rule ID</span>
                    <span className="font-mono text-foreground font-medium">
                      {selectedFinding.ruleId}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span>Status</span>
                    <span className="text-foreground font-medium">
                      {selectedFinding.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sheet Footer: Accept, Reject, and primary Fix this */}
              <SheetFooter className="border-t border-border p-4 flex flex-row items-center justify-end gap-2 bg-card">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSheetOpen(false)}
                >
                  Accept
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSheetOpen(false)}
                >
                  Reject
                </Button>
                {/* Single main action per screen / modal */}
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setSheetOpen(false)}
                >
                  <WrenchIcon data-icon="inline-start" />
                  <span>Fix this</span>
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function FindingsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex flex-col gap-6">
          <Skeleton className="h-12 w-48" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
          <Skeleton className="h-96 w-full rounded-lg" />
        </div>
      }
    >
      <FindingsContent />
    </React.Suspense>
  );
}
