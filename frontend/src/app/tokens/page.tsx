"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/toast";
import {
  InfoIcon,
  LayoutDashboardIcon,
  GitPullRequestIcon,
  ShieldAlertIcon,
  BarChart3Icon,
  SettingsIcon,
  BellIcon,
} from "lucide-react";

interface ColorToken {
  name: string;
  cssVar: string;
  usageNote: string;
}

interface ColorGroup {
  groupName: string;
  tokens: ColorToken[];
}

const colorGroups: ColorGroup[] = [
  {
    groupName: "Surfaces",
    tokens: [
      {
        name: "background",
        cssVar: "--background",
        usageNote: "Main application background canvas",
      },
      {
        name: "card",
        cssVar: "--card",
        usageNote: "Card containers, modals, and panel surfaces",
      },
      {
        name: "muted",
        cssVar: "--muted",
        usageNote: "Subtle backgrounds for tabs, hover states, and inactive elements",
      },
      {
        name: "accent",
        cssVar: "--accent",
        usageNote: "Interactive highlights and selected element backgrounds",
      },
      {
        name: "sidebar",
        cssVar: "--sidebar",
        usageNote: "Navigation sidebar container surface",
      },
    ],
  },
  {
    groupName: "Text",
    tokens: [
      {
        name: "foreground",
        cssVar: "--foreground",
        usageNote: "Primary body text, headings, and high-contrast labels",
      },
      {
        name: "muted-foreground",
        cssVar: "--muted-foreground",
        usageNote: "Secondary descriptions, captions, and muted labels",
      },
      {
        name: "link",
        cssVar: "--link",
        usageNote: "Hyperlinks and interactive text references",
      },
    ],
  },
  {
    groupName: "Lines",
    tokens: [
      {
        name: "border",
        cssVar: "--border",
        usageNote: "Standard borders for cards, dividers, and separators",
      },
      {
        name: "input",
        cssVar: "--input",
        usageNote: "Form control borders and boundary lines",
      },
      {
        name: "ring",
        cssVar: "--ring",
        usageNote: "Focus indicators and keyboard navigation rings",
      },
    ],
  },
  {
    groupName: "Brand",
    tokens: [
      {
        name: "primary",
        cssVar: "--primary",
        usageNote: "Main brand color reserved for the main action and active nav marker",
      },
    ],
  },
  {
    groupName: "Status",
    tokens: [
      {
        name: "success",
        cssVar: "--success",
        usageNote: "Success states, passing verification badges, and positive alerts",
      },
      {
        name: "warning",
        cssVar: "--warning",
        usageNote: "Caution notices, pending status badges, and advisory callouts",
      },
      {
        name: "destructive",
        cssVar: "--destructive",
        usageNote: "Errors, critical security alerts, and destructive actions",
      },
    ],
  },
];

const spacingTokens = [
  { label: "4px", token: "--spacing(1)", widthClass: "w-1" },
  { label: "8px", token: "--spacing(2)", widthClass: "w-2" },
  { label: "12px", token: "--spacing(3)", widthClass: "w-3" },
  { label: "16px", token: "--spacing(4)", widthClass: "w-4" },
  { label: "24px", token: "--spacing(6)", widthClass: "w-6" },
  { label: "32px", token: "--spacing(8)", widthClass: "w-8" },
  { label: "48px", token: "--spacing(12)", widthClass: "w-12" },
];

const radiusTokens = [
  { name: "Small", token: "--radius-sm", radiusClass: "rounded-sm" },
  { name: "Medium", token: "--radius-md", radiusClass: "rounded-md" },
  { name: "Large", token: "--radius-lg", radiusClass: "rounded-lg" },
  { name: "Full", token: "rounded-full", radiusClass: "rounded-full" },
];

function formatComputedColor(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "Loading…";
  if (trimmed.startsWith("#")) {
    return trimmed.toUpperCase();
  }
  const rgbMatch = trimmed.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10).toString(16).padStart(2, "0");
    const g = parseInt(rgbMatch[2], 10).toString(16).padStart(2, "0");
    const b = parseInt(rgbMatch[3], 10).toString(16).padStart(2, "0");
    return `#${r}${g}${b}`.toUpperCase();
  }
  return trimmed;
}

const subscribeNoop = () => () => {};

function getCssVariablesSnapshot(): string {
  if (typeof window === "undefined") return "{}";
  const styles = getComputedStyle(document.documentElement);
  const map: Record<string, string> = {};
  colorGroups.forEach((group) => {
    group.tokens.forEach((token) => {
      const val = styles.getPropertyValue(token.cssVar);
      map[token.cssVar] = formatComputedColor(val);
    });
  });
  return JSON.stringify(map);
}

export default function TokensPage() {
  const isClient = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );

  const rawHexJson = useSyncExternalStore(
    subscribeNoop,
    getCssVariablesSnapshot,
    () => "{}"
  );

  const resolvedHexMap = useMemo(() => {
    try {
      return JSON.parse(rawHexJson) as Record<string, string>;
    } catch {
      return {};
    }
  }, [rawHexJson]);

  return (
    <div className="w-full min-h-screen bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-8">
        {/* Section 1: Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">Design tokens</CardTitle>
            <CardDescription>
              Live design system tokens and component showcase for ReviewPilot.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Section 2: Color swatches in groups */}
        <Card>
          <CardHeader>
            <CardTitle>Color swatches</CardTitle>
            <CardDescription>
              Runtime color values resolved directly from document root CSS variables.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {colorGroups.map((group) => (
              <div key={group.groupName} className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-foreground">
                  {group.groupName}
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {group.tokens.map((token) => {
                    const resolvedHex = isClient
                      ? resolvedHexMap[token.cssVar] || "Reading…"
                      : "Loading…";

                    return (
                      <div
                        key={token.cssVar}
                        className="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
                      >
                        <div
                          className="size-10 shrink-0 rounded-md border border-border shadow-xs"
                          style={{ backgroundColor: `var(${token.cssVar})` }}
                          aria-label={`Color sample for ${token.name}`}
                        />
                        <div className="flex flex-1 flex-col gap-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-foreground truncate">
                              {token.name}
                            </span>
                            <span className="font-mono text-xs text-muted-foreground shrink-0">
                              {token.cssVar}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-foreground">
                              {resolvedHex}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-normal">
                            {token.usageNote}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Section 3: Typography scale */}
        <Card>
          <CardHeader>
            <CardTitle>Typography scale</CardTitle>
            <CardDescription>
              Font hierarchy and weights set in Inter across headings and body text.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Page title</span>
                <span className="font-mono">28px / 36px · Semibold (600)</span>
              </div>
              <div className="text-2xl font-semibold leading-9 text-foreground">
                Automated code review and security diagnostics
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Section heading</span>
                <span className="font-mono">20px / 28px · Semibold (600)</span>
              </div>
              <div className="text-xl font-semibold leading-7 text-foreground">
                Static analysis findings by severity
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Card title</span>
                <span className="font-mono">16px / 24px · Medium (500)</span>
              </div>
              <div className="text-base font-medium leading-6 text-foreground">
                High priority vulnerabilities detected
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Body</span>
                <span className="font-mono">14px / 20px · Regular (400)</span>
              </div>
              <div className="text-sm font-normal leading-5 text-foreground">
                ReviewPilot automatically checks pull requests against defined team standards,
                scanning for memory safety, potential race conditions, and compliance regressions.
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Label</span>
                <span className="font-mono">13px / 20px · Medium (500)</span>
              </div>
              <div className="text-xs font-medium leading-5 text-foreground">
                Repository branch target: main
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Caption</span>
                <span className="font-mono">12px / 16px · Regular (400)</span>
              </div>
              <div className="text-xs font-normal leading-4 text-muted-foreground">
                Last scan executed 4 minutes ago on commit 8b291a4.
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Monospace</span>
                <span className="font-mono">14px / 20px · Regular (400)</span>
              </div>
              <div className="font-mono text-sm leading-5 text-foreground">
                const auditResult = await reviewEngine.analyze(pullRequest);
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Spacing and radius */}
        <Card>
          <CardHeader>
            <CardTitle>Spacing and radius</CardTitle>
            <CardDescription>
              Predictable layout rhythm in multiples of 4px and uniform corner radii.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-foreground">Spacing scale</h3>
              <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
                {spacingTokens.map((item) => (
                  <div key={item.label} className="flex items-center gap-4">
                    <span className="w-12 font-mono text-xs text-muted-foreground text-right shrink-0">
                      {item.label}
                    </span>
                    <div className="flex h-5 items-center">
                      <div
                        className={`h-4 rounded-xs bg-muted-foreground ${item.widthClass}`}
                        aria-label={`Spacing sample of ${item.label}`}
                      />
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">
                      {item.token}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-foreground">Corner radius</h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {radiusTokens.map((item) => (
                  <div
                    key={item.name}
                    className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4"
                  >
                    <div
                      className={`size-16 border border-border bg-muted ${item.radiusClass} flex items-center justify-center`}
                      aria-label={`Corner radius sample for ${item.name}`}
                    >
                      <span className="font-mono text-xs text-muted-foreground">
                        {item.name}
                      </span>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">
                      {item.token}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 5: Components preview */}
        <Card>
          <CardHeader>
            <CardTitle>Components preview</CardTitle>
            <CardDescription>
              Preview of installed shadcn/ui components utilizing registered design tokens.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {/* Buttons */}
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-foreground">Buttons</h3>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="default">Primary action</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
                <Button disabled>Disabled</Button>
              </div>
            </div>

            <Separator />

            {/* Badges */}
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-foreground">Badges</h3>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="destructive">Critical</Badge>
                <Badge className="border-transparent bg-warning/15 text-warning font-medium">
                  High
                </Badge>
                <Badge variant="secondary">Medium</Badge>
                <Badge className="border-transparent bg-success/15 text-success font-medium">
                  Success
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Input with Label */}
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-foreground">Input and focus ring</h3>
              <FieldGroup className="max-w-md">
                <Field>
                  <FieldLabel htmlFor="branch-name">Branch name</FieldLabel>
                  <Input
                    id="branch-name"
                    placeholder="feature/auth-tokens"
                    aria-label="Branch name"
                  />
                </Field>
              </FieldGroup>
            </div>

            <Separator />

            {/* Tabs */}
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-foreground">Tabs</h3>
              <Tabs defaultValue="overview">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="rules">Rules</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="p-2 text-sm text-muted-foreground">
                  View pull request review score and status overview.
                </TabsContent>
                <TabsContent value="rules" className="p-2 text-sm text-muted-foreground">
                  Manage static analysis rules and compliance checks.
                </TabsContent>
                <TabsContent value="history" className="p-2 text-sm text-muted-foreground">
                  Browse previous review logs and verification runs.
                </TabsContent>
              </Tabs>
            </div>

            <Separator />

            {/* Alert */}
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-foreground">Alert callout</h3>
              <Alert>
                <InfoIcon className="size-4" />
                <AlertTitle>Review engine operational</AlertTitle>
                <AlertDescription>
                  All background workers and AST analyzers are running with nominal latency.
                </AlertDescription>
              </Alert>
            </div>

            <Separator />

            {/* Table */}
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-foreground">Table</h3>
              <div className="rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Finding</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium text-foreground">
                        Unsanitized query parameter
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive">Critical</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">Open</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-foreground">
                        Missing cache-control header
                      </TableCell>
                      <TableCell>
                        <Badge className="border-transparent bg-warning/15 text-warning font-medium">
                          High
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">Triaged</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-foreground">
                        Exported interface validation
                      </TableCell>
                      <TableCell>
                        <Badge className="border-transparent bg-success/15 text-success font-medium">
                          Success
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">Resolved</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            <Separator />

            {/* Toast trigger button */}
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-foreground">Toast notification</h3>
              <div>
                <Button
                  variant="outline"
                  onClick={() => {
                    toast.add({
                      title: "Design tokens synced",
                      description: "Theme color variables and fonts loaded successfully.",
                    });
                  }}
                  aria-label="Trigger toast notification"
                >
                  <BellIcon data-icon="inline-start" />
                  Trigger notification toast
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 6: Mini app-shell sample */}
        <Card>
          <CardHeader>
            <CardTitle>Mini app-shell sample</CardTitle>
            <CardDescription>
              Static sample with 240px sidebar, 56px top bar, and content card adhering to layout rules.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex overflow-hidden rounded-lg border border-border bg-background shadow-xs">
              {/* Left sidebar: 240px (w-60) */}
              <aside className="w-60 shrink-0 border-r border-sidebar-border bg-sidebar p-4 flex flex-col justify-between">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 px-2 py-1">
                    <span className="font-semibold text-sidebar-foreground">
                      ReviewPilot
                    </span>
                  </div>
                  <nav className="flex flex-col gap-1" aria-label="Sidebar navigation">
                    <div className="relative flex items-center gap-2 rounded-md bg-sidebar-accent px-3 py-2 text-sm font-medium text-sidebar-accent-foreground">
                      {/* Active nav marker using orange primary */}
                      <span
                        className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-xs bg-primary"
                        aria-hidden="true"
                      />
                      <LayoutDashboardIcon className="size-4 shrink-0 text-sidebar-foreground" />
                      <span>Overview</span>
                    </div>

                    <div className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent cursor-pointer">
                      <GitPullRequestIcon className="size-4 shrink-0 text-muted-foreground" />
                      <span>Pull requests</span>
                    </div>

                    <div className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent cursor-pointer">
                      <ShieldAlertIcon className="size-4 shrink-0 text-muted-foreground" />
                      <span>Rule engine</span>
                    </div>

                    <div className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent cursor-pointer">
                      <BarChart3Icon className="size-4 shrink-0 text-muted-foreground" />
                      <span>Analytics</span>
                    </div>

                    <div className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent cursor-pointer">
                      <SettingsIcon className="size-4 shrink-0 text-muted-foreground" />
                      <span>Settings</span>
                    </div>
                  </nav>
                </div>
                <div className="border-t border-sidebar-border pt-3">
                  <span className="text-xs text-muted-foreground">Version 1.0.0-rc</span>
                </div>
              </aside>

              {/* Main area with 56px (h-14) top bar */}
              <div className="flex flex-1 flex-col min-w-0">
                <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      Repository overview
                    </span>
                  </div>
                  {/* Primary main action button using orange primary */}
                  <Button size="sm" variant="default">
                    Run audit
                  </Button>
                </header>

                <div className="p-4 bg-background">
                  <Card>
                    <CardHeader>
                      <CardTitle>Active branch audit</CardTitle>
                      <CardDescription>
                        Summary of current checks for main branch pull requests.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Total rules evaluated</span>
                        <span className="font-medium text-foreground">128</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Critical security alerts</span>
                        <Badge variant="destructive">0 detected</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Status</span>
                        <Badge className="border-transparent bg-success/15 text-success font-medium">
                          Passing
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
