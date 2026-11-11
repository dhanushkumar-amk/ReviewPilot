"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowUpRightIcon,
  CheckCircle2Icon,
  GitBranchIcon,
  GitPullRequestIcon,
  MessageSquareCodeIcon,
  SearchIcon,
  ShieldAlertIcon,
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
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockLine,
  CodeBlockTitle,
} from "@/components/ui/code-block";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  initialPullRequests,
  type PullRequestRecord,
} from "@/lib/dashboard-data";

function verdictVariant(
  verdict: PullRequestRecord["verdict"]
): React.ComponentProps<typeof Badge>["variant"] {
  if (verdict === "Approved") return "success";
  if (verdict === "Changes requested") return "destructive";
  return "secondary";
}

export default function PullRequestsPage() {
  const [prs, setPrs] =
    React.useState<PullRequestRecord[]>(initialPullRequests);
  const [search, setSearch] = React.useState("");
  const [verdictFilter, setVerdictFilter] = React.useState<string>("all");
  const [selectedPr, setSelectedPr] = React.useState<PullRequestRecord | null>(
    null
  );

  const filteredPrs = prs.filter((pr) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      pr.title.toLowerCase().includes(q) ||
      pr.repository.toLowerCase().includes(q) ||
      pr.author.toLowerCase().includes(q) ||
      `#${pr.number}`.includes(q);
    const matchesVerdict =
      verdictFilter === "all" || pr.verdict === verdictFilter;
    return matchesSearch && matchesVerdict;
  });

  const approvedCount = prs.filter((p) => p.verdict === "Approved").length;
  const blockedCount = prs.filter(
    (p) => p.verdict === "Changes requested"
  ).length;

  const handleApproveOverride = (prId: string) => {
    setPrs((prev) =>
      prev.map((pr) =>
        pr.id === prId ? { ...pr, verdict: "Approved" } : pr
      )
    );
    setSelectedPr((prev) =>
      prev && prev.id === prId ? { ...prev, verdict: "Approved" } : prev
    );
    toast.success("Marked pull request check as Approved");
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pull requests"
        description="Review AI pull request verdicts, inline code diff suggestions, and security gate checks."
        actions={
          <Button
            variant="outline"
            render={<Link href="/findings" />}
            nativeButton={false}
          >
            <ShieldAlertIcon data-icon="inline-start" />
            Findings workbench
          </Button>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Monitored pull requests"
          value={prs.length}
          description="Synced via GitHub & GitLab App webhooks"
          icon={GitPullRequestIcon}
        />
        <StatCard
          title="Approved cleanly"
          value={approvedCount}
          valueClassName="text-success"
          description="Passed all blocking CWE and quality policies"
          badge={{ label: "Ready to merge", variant: "success" }}
        />
        <StatCard
          title="Changes requested"
          value={blockedCount}
          valueClassName="text-destructive"
          description="Merge blocked until inline suggestions resolve"
          icon={MessageSquareCodeIcon}
        />
      </div>

      {/* PR Table */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <CardTitle>Active pull requests</CardTitle>
              <CardDescription>
                Select any pull request to inspect inline AI diff review comments
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <InputGroup className="w-full sm:w-60">
                <InputGroupAddon>
                  <SearchIcon />
                </InputGroupAddon>
                <InputGroupInput
                  type="search"
                  placeholder="Search PRs or authors..."
                  aria-label="Search pull requests"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </InputGroup>

              <ToggleGroup
                variant="outline"
                size="sm"
                value={[verdictFilter]}
                onValueChange={(next) => {
                  if (next[0]) setVerdictFilter(next[0]);
                }}
              >
                <ToggleGroupItem value="all">All</ToggleGroupItem>
                <ToggleGroupItem value="Approved">Approved</ToggleGroupItem>
                <ToggleGroupItem value="Changes requested">
                  Changes
                </ToggleGroupItem>
                <ToggleGroupItem value="In review">In review</ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pull request</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Diff size</TableHead>
                <TableHead>Verdict</TableHead>
                <TableHead className="text-right">Review</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPrs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-sm text-muted-foreground"
                  >
                    No pull requests match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPrs.map((pr) => (
                  <TableRow
                    key={pr.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedPr(pr)}
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">
                          {pr.title}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {pr.repository} #{pr.number} · {pr.updatedAt}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{pr.author}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
                        <GitBranchIcon className="size-3.5" />
                        {pr.sourceBranch}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      <span className="text-success">+{pr.additions}</span>{" "}
                      <span className="text-destructive">-{pr.deletions}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={verdictVariant(pr.verdict)}>
                        {pr.verdict}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPr(pr);
                        }}
                      >
                        Inspect
                        <ArrowUpRightIcon data-icon="inline-end" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Inline PR Diff Review Sheet */}
      <Sheet
        open={Boolean(selectedPr)}
        onOpenChange={(open) => {
          if (!open) setSelectedPr(null);
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col">
          {selectedPr ? (
            <>
              <SheetHeader className="border-b">
                <div className="flex items-center gap-2">
                  <Badge variant={verdictVariant(selectedPr.verdict)}>
                    {selectedPr.verdict}
                  </Badge>
                  <span className="font-mono text-xs text-muted-foreground">
                    {selectedPr.repository} #{selectedPr.number}
                  </span>
                </div>
                <SheetTitle>{selectedPr.title}</SheetTitle>
                <SheetDescription>
                  {selectedPr.author} · {selectedPr.sourceBranch} →{" "}
                  {selectedPr.targetBranch}
                </SheetDescription>
              </SheetHeader>

              <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
                <Card size="sm">
                  <CardHeader>
                    <CardTitle>AI review summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {selectedPr.summary}
                    </p>
                  </CardContent>
                </Card>

                {selectedPr.comments.length === 0 ? (
                  <Card size="sm">
                    <CardContent className="flex items-center gap-2 text-sm text-success">
                      <CheckCircle2Icon className="size-4" />
                      <span>
                        No security or reliability suggestions raised on this
                        diff.
                      </span>
                    </CardContent>
                  </Card>
                ) : (
                  selectedPr.comments.map((comment) => (
                    <div key={comment.id} className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {comment.title}
                        </span>
                        <Badge
                          variant={
                            comment.severity === "Critical" ||
                            comment.severity === "High"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {comment.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {comment.suggestion}
                      </p>
                      <CodeBlock size="sm">
                        <CodeBlockHeader>
                          <CodeBlockTitle className="font-mono">
                            {comment.file}:{comment.line}
                          </CodeBlockTitle>
                          <CodeBlockActions>
                            <CodeBlockCopyButton value={comment.addedLine} />
                          </CodeBlockActions>
                        </CodeBlockHeader>
                        <CodeBlockContent>
                          <CodeBlockLine variant="removed">
                            {comment.removedLine}
                          </CodeBlockLine>
                          <CodeBlockLine className="bg-success/10 text-success after:text-success after:content-['+']">
                            {comment.addedLine}
                          </CodeBlockLine>
                        </CodeBlockContent>
                      </CodeBlock>
                    </div>
                  ))
                )}
              </div>

              <SheetFooter className="border-t">
                <Button
                  variant="outline"
                  render={<Link href="/findings" />}
                  nativeButton={false}
                >
                  View in findings
                </Button>
                {selectedPr.verdict !== "Approved" ? (
                  <Button
                    onClick={() => handleApproveOverride(selectedPr.id)}
                  >
                    <CheckCircle2Icon data-icon="inline-start" />
                    Approve check
                  </Button>
                ) : null}
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
