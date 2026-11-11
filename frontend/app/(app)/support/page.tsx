"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ActivityIcon,
  CheckCircle2Icon,
  ClockIcon,
  LifeBuoyIcon,
  RefreshCwIcon,
  SendIcon,
} from "lucide-react";

import { PageHeader } from "@/components/app-shell/page-header";
import { StatCard } from "@/components/app-shell/stat-card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import {
  Field,
  FieldDescription,
  FieldError,
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
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  initialSupportTickets,
  type SupportTicketRecord,
} from "@/lib/dashboard-data";
import { useHealth } from "@/features/health/use-health";

const categoryItems = [
  { label: "Scanner Engine", value: "Scanner Engine" },
  { label: "GitHub App", value: "GitHub App" },
  { label: "Billing", value: "Billing" },
  { label: "Security", value: "Security" },
];

const priorityItems = [
  { label: "Normal (4h SLA)", value: "Normal" },
  { label: "Urgent (30m SLA)", value: "Urgent" },
  { label: "Low (24h SLA)", value: "Low" },
];

export default function SupportPage() {
  const { data: health, isFetching, refetch } = useHealth();
  const [tickets, setTickets] = React.useState<SupportTicketRecord[]>(
    initialSupportTickets
  );

  const [subject, setSubject] = React.useState("");
  const [category, setCategory] =
    React.useState<SupportTicketRecord["category"]>("Scanner Engine");
  const [priority, setPriority] =
    React.useState<SupportTicketRecord["priority"]>("Normal");
  const [message, setMessage] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [subjectError, setSubjectError] = React.useState<string | null>(null);

  const apiHealthy = health?.status === "ok" && health?.db === "ok";

  const handleSubmitTicket = (event: React.FormEvent) => {
    event.preventDefault();
    if (!subject.trim()) {
      setSubjectError("Provide a short summary of the issue.");
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      const nextTicket: SupportTicketRecord = {
        id: `SUP-${420 + tickets.length}`,
        subject: subject.trim(),
        category,
        priority,
        status: "Open",
        updatedAt: "Just now",
      };
      setTickets((prev) => [nextTicket, ...prev]);
      setSubject("");
      setMessage("");
      setSubjectError(null);
      setSubmitting(false);
      toast.success(`Submitted support ticket ${nextTicket.id}`);
    }, 350);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Support"
        showTabs={false}
        description="Live ReviewPilot platform telemetry, troubleshooting checklists, and priority engineering support."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              {isFetching ? (
                <Spinner />
              ) : (
                <RefreshCwIcon data-icon="inline-start" />
              )}
              Refresh status
            </Button>
            <Button
              variant="outline"
              render={<Link href="/status" />}
              nativeButton={false}
            >
              Public status page
            </Button>
          </>
        }
      />

      {/* Live Health Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="API & Inngest backend"
          value={
            isFetching ? (
              "Checking..."
            ) : apiHealthy ? (
              "Operational"
            ) : (
              "Degraded"
            )
          }
          valueClassName={apiHealthy ? "text-success" : "text-destructive"}
          description={
            health
              ? `Database ${health.db.toUpperCase()} · ${health.dbLatencyMs ?? "—"}ms latency`
              : "Verifying health endpoint"
          }
          badge={
            apiHealthy
              ? { label: "Live", variant: "success" }
              : { label: "Check", variant: "destructive" }
          }
        />
        <StatCard
          title="Enterprise SLA target"
          value="< 30m"
          description="Priority response for urgent merge-blocking incidents"
          icon={ClockIcon}
        />
        <StatCard
          title="Open requests"
          value={tickets.filter((t) => t.status !== "Resolved").length}
          description={`${tickets.length} total tickets in workspace history`}
          icon={LifeBuoyIcon}
        />
      </div>

      <Alert>
        <CheckCircle2Icon />
        <AlertTitle>Direct engineering escalation active</AlertTitle>
        <AlertDescription>
          Enterprise workspaces include shared Slack escalation and direct CWE
          rule tuning assistance. Include a scan ID (e.g. SCN-8944) for fastest
          diagnostics.
        </AlertDescription>
      </Alert>

      {/* Main Split: Ticket Form + Existing Tickets & Checklist */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <form onSubmit={handleSubmitTicket} className="flex h-full flex-col">
            <CardHeader className="border-b">
              <CardTitle>Open support request</CardTitle>
              <CardDescription>
                Reach the ReviewPilot security & infrastructure team
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pt-4">
              <FieldGroup>
                <Field data-invalid={subjectError ? true : undefined}>
                  <FieldLabel htmlFor="sup-subject">Subject</FieldLabel>
                  <Input
                    id="sup-subject"
                    placeholder="e.g. Webhook timeout on monorepo PR #482"
                    value={subject}
                    onChange={(e) => {
                      setSubject(e.target.value);
                      setSubjectError(null);
                    }}
                    aria-invalid={subjectError ? true : undefined}
                  />
                  {subjectError ? (
                    <FieldError>{subjectError}</FieldError>
                  ) : null}
                </Field>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="sup-cat">Area</FieldLabel>
                    <Select
                      items={categoryItems}
                      value={category}
                      onValueChange={(value) => {
                        if (value) {
                          setCategory(value as SupportTicketRecord["category"]);
                        }
                      }}
                    >
                      <SelectTrigger id="sup-cat" className="w-full">
                        <SelectValue placeholder="Area" />
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        <SelectGroup>
                          {categoryItems.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="sup-pri">Priority</FieldLabel>
                    <Select
                      items={priorityItems}
                      value={priority}
                      onValueChange={(value) => {
                        if (value) {
                          setPriority(value as SupportTicketRecord["priority"]);
                        }
                      }}
                    >
                      <SelectTrigger id="sup-pri" className="w-full">
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        <SelectGroup>
                          {priorityItems.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="sup-msg">Diagnostic details</FieldLabel>
                  <Textarea
                    id="sup-msg"
                    rows={4}
                    placeholder="Share repository slug, scan ID, or expected vs actual verdict..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  <FieldDescription>
                    Never paste private credentials or database URLs in support
                    tickets.
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </CardContent>
            <CardFooter className="justify-end">
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <Spinner />
                ) : (
                  <SendIcon data-icon="inline-start" />
                )}
                {submitting ? "Sending..." : "Submit ticket"}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <div className="flex flex-col gap-6 lg:col-span-3">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Recent workspace tickets</CardTitle>
              <CardDescription>
                Track active investigations and resolved inquiries
              </CardDescription>
              <CardAction>
                <ActivityIcon className="size-4 text-muted-foreground" />
              </CardAction>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-mono text-xs font-medium">
                        {ticket.id}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate font-medium">
                        {ticket.subject}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            ticket.priority === "Urgent"
                              ? "destructive"
                              : "outline"
                          }
                        >
                          {ticket.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            ticket.status === "Resolved"
                              ? "success"
                              : ticket.status === "In progress"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {ticket.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">
                        {ticket.updatedAt}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>Self-service troubleshooting</CardTitle>
              <CardDescription>
                Common webhook and pull request check resolution steps
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <Accordion defaultValue={["ts-1"]}>
                <AccordionItem value="ts-1">
                  <AccordionTrigger>
                    Why is a pull request check stuck in Queued?
                  </AccordionTrigger>
                  <AccordionContent>
                    Confirm the repository&apos;s webhook shows Connected on the
                    Repositories page, or open Scans and click Re-run scan on
                    the latest execution.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="ts-2">
                  <AccordionTrigger>
                    How do I dismiss a false-positive finding?
                  </AccordionTrigger>
                  <AccordionContent>
                    Open the finding row in the Findings workbench and click
                    Reject in the remediation drawer, or exclude the path glob
                    inside `.reviewpilot.yml`.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
