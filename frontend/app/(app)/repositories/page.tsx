"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  FolderGit2Icon,
  GitBranchIcon,
  MoreHorizontalIcon,
  PlayIcon,
  PlusIcon,
  SearchIcon,
  ShieldAlertIcon,
  WebhookIcon,
} from "lucide-react";

import { PageHeader } from "@/components/app-shell/page-header";
import { StatCard } from "@/components/app-shell/stat-card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
import { Switch } from "@/components/ui/switch";
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
  type RepositoryRecord,
} from "@/lib/dashboard-data";

const providerItems = [
  { label: "GitHub", value: "GitHub" },
  { label: "GitLab", value: "GitLab" },
  { label: "Bitbucket", value: "Bitbucket" },
];

export default function RepositoriesPage() {
  const [repos, setRepos] =
    React.useState<RepositoryRecord[]>(initialRepositories);
  const [search, setSearch] = React.useState("");
  const [providerFilter, setProviderFilter] = React.useState<string>("all");

  const [connectOpen, setConnectOpen] = React.useState(false);
  const [repoSlug, setRepoSlug] = React.useState("");
  const [repoProvider, setRepoProvider] =
    React.useState<RepositoryRecord["provider"]>("GitHub");
  const [repoBranch, setRepoBranch] = React.useState("main");
  const [repoAutoScan, setRepoAutoScan] = React.useState(true);
  const [formError, setFormError] = React.useState<string | null>(null);

  const [repoToDisconnect, setRepoToDisconnect] =
    React.useState<RepositoryRecord | null>(null);

  const filteredRepos = repos.filter((repo) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      repo.fullName.toLowerCase().includes(q) ||
      repo.language.toLowerCase().includes(q);
    const matchesProvider =
      providerFilter === "all" || repo.provider === providerFilter;
    return matchesSearch && matchesProvider;
  });

  const connectedCount = repos.filter(
    (repo) => repo.webhookStatus === "Connected"
  ).length;
  const autoScanCount = repos.filter((repo) => repo.autoScan).length;
  const totalOpenFindings = repos.reduce(
    (sum, repo) => sum + repo.openFindings,
    0
  );

  const handleToggleAutoScan = (repoId: string, nextValue: boolean) => {
    setRepos((prev) =>
      prev.map((repo) =>
        repo.id === repoId ? { ...repo, autoScan: nextValue } : repo
      )
    );
    toast.success(
      nextValue ? "Enabled automatic PR scanning" : "Paused automatic PR scanning"
    );
  };

  const handleConnectSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = repoSlug.trim();
    if (!trimmed.includes("/")) {
      setFormError("Use owner/repository format (e.g. acme/api-gateway).");
      return;
    }
    if (repos.some((r) => r.fullName.toLowerCase() === trimmed.toLowerCase())) {
      setFormError("This repository is already connected.");
      return;
    }
    const created: RepositoryRecord = {
      id: `repo-${Date.now()}`,
      fullName: trimmed,
      provider: repoProvider,
      language: "TypeScript",
      defaultBranch: repoBranch.trim() || "main",
      autoScan: repoAutoScan,
      webhookStatus: "Connected",
      lastScanAt: "Queued just now",
      openFindings: 0,
      coveragePct: 100,
    };
    setRepos((prev) => [created, ...prev]);
    setRepoSlug("");
    setRepoBranch("main");
    setFormError(null);
    setConnectOpen(false);
    toast.success(`Connected ${created.fullName}`);
  };

  const handleConfirmDisconnect = () => {
    if (!repoToDisconnect) return;
    setRepos((prev) => prev.filter((r) => r.id !== repoToDisconnect.id));
    toast.success(`Disconnected ${repoToDisconnect.fullName}`);
    setRepoToDisconnect(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Repositories"
        description="Manage connected Git repositories, webhook delivery health, and automatic PR scanning defaults."
        actions={
          <Dialog open={connectOpen} onOpenChange={setConnectOpen}>
            <DialogTrigger render={<Button />}>
              <PlusIcon data-icon="inline-start" />
              Connect repository
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <form
                onSubmit={handleConnectSubmit}
                className="flex flex-col gap-4"
              >
                <DialogHeader>
                  <DialogTitle>Connect Git repository</DialogTitle>
                  <DialogDescription>
                    Install ReviewPilot webhooks and enable automated PR checks
                    on every pull request.
                  </DialogDescription>
                </DialogHeader>
                <FieldGroup>
                  <Field data-invalid={formError ? true : undefined}>
                    <FieldLabel htmlFor="repo-slug">Repository slug</FieldLabel>
                    <Input
                      id="repo-slug"
                      placeholder="reviewpilot/payments-api"
                      value={repoSlug}
                      onChange={(e) => {
                        setRepoSlug(e.target.value);
                        setFormError(null);
                      }}
                      aria-invalid={formError ? true : undefined}
                    />
                    {formError ? (
                      <FieldError>{formError}</FieldError>
                    ) : (
                      <FieldDescription>
                        Provide the full organization/repository identifier.
                      </FieldDescription>
                    )}
                  </Field>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="repo-provider">Provider</FieldLabel>
                      <Select
                        items={providerItems}
                        value={repoProvider}
                        onValueChange={(value) => {
                          if (value) {
                            setRepoProvider(
                              value as RepositoryRecord["provider"]
                            );
                          }
                        }}
                      >
                        <SelectTrigger id="repo-provider" className="w-full">
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                        <SelectContent alignItemWithTrigger={false}>
                          <SelectGroup>
                            {providerItems.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="repo-branch">
                        Default branch
                      </FieldLabel>
                      <Input
                        id="repo-branch"
                        value={repoBranch}
                        onChange={(e) => setRepoBranch(e.target.value)}
                      />
                    </Field>
                  </div>
                  <Field orientation="horizontal">
                    <FieldContent>
                      <FieldLabel htmlFor="repo-autoscan">
                        Automatic PR review
                      </FieldLabel>
                      <FieldDescription>
                        Trigger AI + CWE security scans on new commits.
                      </FieldDescription>
                    </FieldContent>
                    <Switch
                      id="repo-autoscan"
                      checked={repoAutoScan}
                      onCheckedChange={setRepoAutoScan}
                    />
                  </Field>
                </FieldGroup>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConnectOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Connect repository</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {/* KPI Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Connected repositories"
          value={connectedCount}
          description={`${repos.length} configured across Git providers`}
          icon={FolderGit2Icon}
        />
        <StatCard
          title="Auto-scan active"
          value={autoScanCount}
          description="Webhooks verifying every pull request diff"
          badge={{ label: "Webhooks healthy", variant: "success" }}
        />
        <StatCard
          title="Open repo findings"
          value={totalOpenFindings}
          description="Prioritized across critical and high rules"
          icon={ShieldAlertIcon}
        />
      </div>

      {/* Repository Inventory Table */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <CardTitle>Connected repositories</CardTitle>
              <CardDescription>
                {filteredRepos.length} of {repos.length} repositories shown
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <InputGroup className="w-full sm:w-60">
                <InputGroupAddon>
                  <SearchIcon />
                </InputGroupAddon>
                <InputGroupInput
                  type="search"
                  placeholder="Filter repositories..."
                  aria-label="Filter repositories"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </InputGroup>

              <ToggleGroup
                variant="outline"
                size="sm"
                value={[providerFilter]}
                onValueChange={(next) => {
                  if (next[0]) setProviderFilter(next[0]);
                }}
              >
                <ToggleGroupItem value="all">All</ToggleGroupItem>
                <ToggleGroupItem value="GitHub">GitHub</ToggleGroupItem>
                <ToggleGroupItem value="GitLab">GitLab</ToggleGroupItem>
                <ToggleGroupItem value="Bitbucket">Bitbucket</ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Repository</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Webhook</TableHead>
                <TableHead>Findings</TableHead>
                <TableHead>Auto-scan</TableHead>
                <TableHead className="w-12 text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRepos.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-24 text-center text-sm text-muted-foreground"
                  >
                    No repositories match your current filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRepos.map((repo) => (
                  <TableRow key={repo.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-mono font-medium text-foreground">
                          {repo.fullName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {repo.language} · Last scan {repo.lastScanAt}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{repo.provider}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
                        <GitBranchIcon className="size-3.5" />
                        {repo.defaultBranch}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          repo.webhookStatus === "Connected"
                            ? "success"
                            : "destructive"
                        }
                      >
                        <WebhookIcon data-icon="inline-start" />
                        {repo.webhookStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm tabular-nums">
                      {repo.openFindings}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={repo.autoScan}
                        aria-label={`Toggle auto-scan for ${repo.fullName}`}
                        onCheckedChange={(checked) =>
                          handleToggleAutoScan(repo.id, checked)
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Actions for ${repo.fullName}`}
                            />
                          }
                        >
                          <MoreHorizontalIcon />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuGroup>
                            <DropdownMenuItem
                              onClick={() =>
                                toast.success(
                                  `Queued manual scan for ${repo.fullName}`
                                )
                              }
                            >
                              <PlayIcon data-icon="inline-start" />
                              Run manual scan
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                          <DropdownMenuSeparator />
                          <DropdownMenuGroup>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setRepoToDisconnect(repo)}
                            >
                              Disconnect
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog
        open={Boolean(repoToDisconnect)}
        onOpenChange={(open) => {
          if (!open) setRepoToDisconnect(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect repository?</AlertDialogTitle>
            <AlertDialogDescription>
              {repoToDisconnect
                ? `Removing ${repoToDisconnect.fullName} stops incoming PR reviews and revokes its webhook secret.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirmDisconnect}
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
