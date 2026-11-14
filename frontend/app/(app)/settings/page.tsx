"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  BellIcon,
  CheckIcon,
  CopyIcon,
  KeyRoundIcon,
  RefreshCwIcon,
  SaveIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
} from "lucide-react";

import { PageHeader } from "@/components/app-shell/page-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
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
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAiSettings, useAiUsage, useUpdateAiSettings } from "@/src/features/ai/use-ai";
import { AiDisclosureDialog } from "@/components/ai/ai-disclosure-dialog";
import { useWorkspace } from "@/src/features/me/use-me";
import { BotIcon } from "lucide-react";

const regionItems = [
  { label: "US East (Virginia)", value: "us-east-1" },
  { label: "EU Central (Frankfurt)", value: "eu-central-1" },
  { label: "AP South (Mumbai)", value: "ap-south-1" },
];

const blockSeverityItems = [
  { label: "Critical only", value: "Critical" },
  { label: "Critical & High", value: "High" },
  { label: "Medium and above", value: "Medium" },
  { label: "Advisory only (never block)", value: "None" },
];

export default function SettingsPage() {
  const { activeWorkspace } = useWorkspace();
  const role = activeWorkspace?.role?.trim().toLowerCase();
  const isOwnerOrAdmin = role === "owner" || role === "admin";

  const aiSettingsQuery = useAiSettings();
  const aiUsageQuery = useAiUsage();
  const updateAiSettings = useUpdateAiSettings();

  const [aiDisclosureOpen, setAiDisclosureOpen] = React.useState(false);
  const [workspaceName, setWorkspaceName] = React.useState("ReviewPilot Org");
  const [workspaceSlug, setWorkspaceSlug] = React.useState("reviewpilot-org");
  const [region, setRegion] = React.useState("us-east-1");

  const [autoReviewPr, setAutoReviewPr] = React.useState(true);
  const [inlinePatches, setInlinePatches] = React.useState(true);
  const [ignoreDrafts, setIgnoreDrafts] = React.useState(true);
  const [blockThreshold, setBlockThreshold] = React.useState("High");

  const [emailDigest, setEmailDigest] = React.useState(true);
  const [notifyCritical, setNotifyCritical] = React.useState(true);
  const [notifyFailedScans, setNotifyFailedScans] = React.useState(true);
  const [slackWebhook, setSlackWebhook] = React.useState(
    "https://hooks.slack.com/services/T000/B000/example"
  );

  const [apiToken, setApiToken] = React.useState(
    "rp_live_98c4a21f7b0e44d8a19c3f62e81b04a7"
  );
  const [copiedToken, setCopiedToken] = React.useState(false);

  const handleCopyToken = () => {
    navigator.clipboard
      ?.writeText(apiToken)
      .then(() => {
        setCopiedToken(true);
        toast.success("Copied API token to clipboard");
        setTimeout(() => setCopiedToken(false), 2000);
      })
      .catch(() => toast.error("Clipboard permission denied"));
  };

  const handleRotateToken = () => {
    const suffix = Math.random().toString(16).slice(2, 18);
    setApiToken(`rp_live_${suffix}e81b04a7`);
    toast.success("Generated a new workspace API token");
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Configure workspace defaults, pull request merge policies, alert channels, and API credentials."
      />

      <Tabs defaultValue="general" className="gap-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="policies">Scan policies</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="api">API & Webhooks</TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Workspace profile</CardTitle>
              <CardDescription>
                Organization metadata and primary compute residency for scanner
                workers
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <FieldGroup className="max-w-xl">
                <Field>
                  <FieldLabel htmlFor="ws-name">Workspace name</FieldLabel>
                  <Input
                    id="ws-name"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="ws-slug">URL slug</FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>
                      <span className="font-mono text-xs">reviewpilot.dev/</span>
                    </InputGroupAddon>
                    <InputGroupInput
                      id="ws-slug"
                      value={workspaceSlug}
                      onChange={(e) => setWorkspaceSlug(e.target.value)}
                    />
                  </InputGroup>
                  <FieldDescription>
                    Used in GitHub App status check links and webhook endpoints.
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="ws-region">Compute region</FieldLabel>
                  <Select
                    items={regionItems}
                    value={region}
                    onValueChange={(value) => {
                      if (value) setRegion(value);
                    }}
                  >
                    <SelectTrigger id="ws-region" className="w-full">
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      <SelectGroup>
                        {regionItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
            </CardContent>
            <CardFooter className="justify-end">
              <Button
                onClick={() => toast.success("Saved workspace settings")}
              >
                <SaveIcon data-icon="inline-start" />
                Save changes
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Scan Policies Tab */}
        <TabsContent value="policies" className="flex flex-col gap-6">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>AI Assist</CardTitle>
              <CardDescription>
                Enable AI-powered finding explanations and automated fix drafting for your workspace.
              </CardDescription>
              <CardAction>
                <BotIcon className="size-4 text-link" />
              </CardAction>
            </CardHeader>
            <CardContent className="pt-4">
              <FieldSet className="max-w-2xl">
                <FieldGroup>
                  <Field orientation="horizontal">
                    <FieldContent>
                      <FieldLabel htmlFor="ai-assist-toggle">
                        Workspace AI Assist
                      </FieldLabel>
                      <FieldDescription>
                        Allows workspace members to request explanations and draft fixes. Free-tier providers have daily limits.
                      </FieldDescription>
                    </FieldContent>
                    <Switch
                      id="ai-assist-toggle"
                      checked={aiSettingsQuery.data?.aiEnabled ?? false}
                      disabled={!isOwnerOrAdmin || updateAiSettings.isPending}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setAiDisclosureOpen(true);
                        } else {
                          void updateAiSettings.mutateAsync(false).then(() => {
                            toast.success("Disabled AI assist");
                          });
                        }
                      }}
                    />
                  </Field>

                  {aiUsageQuery.data && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                      <span>Today&apos;s AI Usage</span>
                      <span className="font-mono">
                        {aiUsageQuery.data.callsToday} / {aiUsageQuery.data.limit} calls used
                      </span>
                    </div>
                  )}
                </FieldGroup>
              </FieldSet>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>Automated review & merge gates</CardTitle>
              <CardDescription>
                Default rules applied to newly connected repositories unless
                overridden by `.reviewpilot.yml`
              </CardDescription>
              <CardAction>
                <SlidersHorizontalIcon className="size-4 text-muted-foreground" />
              </CardAction>
            </CardHeader>
            <CardContent className="pt-4">
              <FieldSet className="max-w-2xl">
                <FieldLegend variant="label">Pull request behavior</FieldLegend>
                <FieldGroup>
                  <Field orientation="horizontal">
                    <FieldContent>
                      <FieldLabel htmlFor="pol-auto">
                        Automatic PR diff analysis
                      </FieldLabel>
                      <FieldDescription>
                        Queue an Inngest scan job whenever commits are pushed to
                        an open pull request.
                      </FieldDescription>
                    </FieldContent>
                    <Switch
                      id="pol-auto"
                      checked={autoReviewPr}
                      onCheckedChange={setAutoReviewPr}
                    />
                  </Field>
                  <Separator />
                  <Field orientation="horizontal">
                    <FieldContent>
                      <FieldLabel htmlFor="pol-patches">
                        Inline AI patch suggestions
                      </FieldLabel>
                      <FieldDescription>
                        Post committable fix snippets directly on vulnerable
                        diff hunks.
                      </FieldDescription>
                    </FieldContent>
                    <Switch
                      id="pol-patches"
                      checked={inlinePatches}
                      onCheckedChange={setInlinePatches}
                    />
                  </Field>
                  <Separator />
                  <Field orientation="horizontal">
                    <FieldContent>
                      <FieldLabel htmlFor="pol-drafts">
                        Skip draft pull requests
                      </FieldLabel>
                      <FieldDescription>
                        Defer deep taint analysis until a pull request is marked
                        ready for review.
                      </FieldDescription>
                    </FieldContent>
                    <Switch
                      id="pol-drafts"
                      checked={ignoreDrafts}
                      onCheckedChange={setIgnoreDrafts}
                    />
                  </Field>
                  <Separator />
                  <Field className="max-w-xs">
                    <FieldLabel htmlFor="pol-threshold">
                      Blocking severity threshold
                    </FieldLabel>
                    <Select
                      items={blockSeverityItems}
                      value={blockThreshold}
                      onValueChange={(value) => {
                        if (value) setBlockThreshold(value);
                      }}
                    >
                      <SelectTrigger id="pol-threshold" className="w-full">
                        <SelectValue placeholder="Choose threshold" />
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        <SelectGroup>
                          {blockSeverityItems.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>
              </FieldSet>
            </CardContent>
            <CardFooter className="justify-end">
              <Button
                onClick={() => toast.success("Updated scan policy defaults")}
              >
                <ShieldCheckIcon data-icon="inline-start" />
                Save policy defaults
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Alerting & digest preferences</CardTitle>
              <CardDescription>
                Route critical security findings and scan failures to team
                inboxes
              </CardDescription>
              <CardAction>
                <BellIcon className="size-4 text-muted-foreground" />
              </CardAction>
            </CardHeader>
            <CardContent className="pt-4">
              <FieldGroup className="max-w-xl">
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldLabel htmlFor="notif-digest">
                      Weekly security digest
                    </FieldLabel>
                    <FieldDescription>
                      Summary of resolved issues and mean time to remediate sent
                      Mondays at 09:00 UTC.
                    </FieldDescription>
                  </FieldContent>
                  <Switch
                    id="notif-digest"
                    checked={emailDigest}
                    onCheckedChange={setEmailDigest}
                  />
                </Field>

                <FieldSet>
                  <FieldLegend variant="label">Real-time triggers</FieldLegend>
                  <Field orientation="horizontal">
                    <Checkbox
                      id="notif-crit"
                      checked={notifyCritical}
                      onCheckedChange={(checked) =>
                        setNotifyCritical(Boolean(checked))
                      }
                    />
                    <FieldLabel htmlFor="notif-crit" className="font-normal">
                      Notify immediately on Critical CWE findings
                    </FieldLabel>
                  </Field>
                  <Field orientation="horizontal">
                    <Checkbox
                      id="notif-fail"
                      checked={notifyFailedScans}
                      onCheckedChange={(checked) =>
                        setNotifyFailedScans(Boolean(checked))
                      }
                    />
                    <FieldLabel htmlFor="notif-fail" className="font-normal">
                      Alert workspace admins when a repository webhook or scan
                      fails
                    </FieldLabel>
                  </Field>
                </FieldSet>

                <Field>
                  <FieldLabel htmlFor="slack-url">
                    Slack incoming webhook URL
                  </FieldLabel>
                  <Input
                    id="slack-url"
                    type="url"
                    value={slackWebhook}
                    onChange={(e) => setSlackWebhook(e.target.value)}
                  />
                </Field>
              </FieldGroup>
            </CardContent>
            <CardFooter className="justify-between">
              <Button
                variant="outline"
                onClick={() => toast.success("Sent test Slack notification")}
              >
                Send test payload
              </Button>
              <Button
                onClick={() => toast.success("Saved notification preferences")}
              >
                Save preferences
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* API & Webhooks Tab */}
        <TabsContent value="api">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Workspace API key & CLI authentication</CardTitle>
              <CardDescription>
                Authenticate `@reviewpilot/cli` in CI pipelines without
                exposing personal session cookies
              </CardDescription>
              <CardAction>
                <Badge variant="success">Active</Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="pt-4">
              <FieldGroup className="max-w-xl">
                <Field>
                  <FieldLabel htmlFor="api-key-field">
                    Organization token
                  </FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>
                      <KeyRoundIcon />
                    </InputGroupAddon>
                    <InputGroupInput
                      id="api-key-field"
                      readOnly
                      value={apiToken}
                      className="font-mono"
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        size="xs"
                        onClick={handleCopyToken}
                        aria-label="Copy workspace token"
                      >
                        {copiedToken ? <CheckIcon /> : <CopyIcon />}
                        {copiedToken ? "Copied" : "Copy"}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                  <FieldDescription>
                    Store this key as `REVIEWPILOT_TOKEN` in encrypted CI
                    secrets.
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </CardContent>
            <CardFooter className="justify-between">
              <span className="text-xs text-muted-foreground">
                Scoped to read repositories and write scan check runs
              </span>
              <AlertDialog>
                <AlertDialogTrigger render={<Button variant="destructive" />}>
                  <RefreshCwIcon data-icon="inline-start" />
                  Rotate token
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Rotate workspace token?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Any CI workflow currently using the old `rp_live_` token
                      will immediately receive HTTP 401 until updated.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={handleRotateToken}
                    >
                      Rotate token
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      <AiDisclosureDialog
        open={aiDisclosureOpen}
        onOpenChange={setAiDisclosureOpen}
        onSuccess={() => void aiSettingsQuery.refetch()}
      />
    </div>
  );
}
