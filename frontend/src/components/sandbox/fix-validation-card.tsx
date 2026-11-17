"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  ClockIcon,
  MinusCircleIcon,
  PlayIcon,
  ShieldAlertIcon,
  TerminalIcon,
  XCircleIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useFixValidation,
  useSandboxSettings,
  useValidateFix,
  type FixValidation,
  type StaticCheckItem,
  type TestStepItem,
} from "@/src/features/sandbox/use-sandbox";
import { useWorkspace } from "@/src/features/me/use-me";

const ERROR_MESSAGES: Record<string, { title: string; desc: string }> = {
  SANDBOX_DISABLED: {
    title: "Test runs disabled",
    desc: "Test runs are disabled in workspace settings.",
  },
  SANDBOX_NOT_CONFIGURED: {
    title: "Test environment not configured",
    desc: "The test container environment is not configured on the server.",
  },
  SANDBOX_LIMIT_REACHED: {
    title: "Daily quota reached",
    desc: "Your workspace has reached its daily limit for sandbox test runs.",
  },
  SANDBOX_BUSY: {
    title: "Test service busy",
    desc: "The test environment is currently at full capacity. Please try again in a few minutes.",
  },
  SANDBOX_ALREADY_RUNNING: {
    title: "Validation already in progress",
    desc: "A validation run is already queued or active for this fix proposal.",
  },
  REPO_TOO_LARGE: {
    title: "Repository snapshot too large",
    desc: "The repository archive exceeds the maximum permitted size for sandbox execution.",
  },
  DOWNLOAD_FAILED: {
    title: "Snapshot download failed",
    desc: "Unable to download the repository snapshot from GitHub.",
  },
  TIMEOUT: {
    title: "Validation timed out",
    desc: "The validation run exceeded the maximum allowed execution time.",
  },
  LAMBDA_FAILED: {
    title: "Test execution failed",
    desc: "The test container encountered an execution failure while running scripts.",
  },
  INTERNAL: {
    title: "Validation error",
    desc: "An unexpected error occurred during validation.",
  },
};

interface FixValidationCardProps {
  proposalId: string;
  initialValidation?: FixValidation | null;
  onValidationChange?: (validation: FixValidation | null) => void;
}

export function FixValidationCard({
  proposalId,
  initialValidation,
  onValidationChange,
}: FixValidationCardProps) {
  const { activeWorkspace } = useWorkspace();
  const role = activeWorkspace?.role?.trim().toLowerCase();
  const isOwnerOrAdmin = role === "owner" || role === "admin";

  const sandboxSettingsQuery = useSandboxSettings();
  const sandboxEnabled = sandboxSettingsQuery.data?.sandboxEnabled ?? false;

  const [runTestsChecked, setRunTestsChecked] = React.useState(false);
  const [activeValidationId, setActiveValidationId] = React.useState<string | null>(
    initialValidation?.id ?? null
  );

  const validateMutation = useValidateFix(proposalId);
  const validationQuery = useFixValidation(activeValidationId);

  const validation = validationQuery.data ?? initialValidation;

  React.useEffect(() => {
    onValidationChange?.(validation ?? null);
  }, [validation, onValidationChange]);

  const isRunning =
    validation?.status === "QUEUED" ||
    validation?.status === "RUNNING" ||
    validateMutation.isPending;

  const handleRunValidation = async () => {
    try {
      const res = await validateMutation.mutateAsync({
        runTests: sandboxEnabled && runTestsChecked,
      });
      setActiveValidationId(res.validationId);
      toast.success(
        sandboxEnabled && runTestsChecked
          ? "Validation started with test runs"
          : "Static validation started"
      );
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || "INTERNAL";
      const friendly = ERROR_MESSAGES[code]?.title || "Failed to start validation";
      toast.error(friendly);
    }
  };

  const renderStatusBadge = (status?: string) => {
    switch (status) {
      case "PASSED":
        return (
          <Badge variant="outline" className="border-success/40 text-success gap-1">
            <CheckCircle2Icon className="size-3" />
            Passed
          </Badge>
        );
      case "PASSED_WITH_WARNINGS":
        return (
          <Badge variant="outline" className="border-warning/40 text-warning gap-1">
            <AlertCircleIcon className="size-3" />
            Passed with warnings
          </Badge>
        );
      case "FAILED":
        return (
          <Badge variant="outline" className="border-destructive/40 text-destructive gap-1">
            <XCircleIcon className="size-3" />
            Failed
          </Badge>
        );
      case "ERROR":
        return (
          <Badge variant="outline" className="border-destructive/40 text-destructive gap-1">
            <ShieldAlertIcon className="size-3" />
            Error
          </Badge>
        );
      case "RUNNING":
        return (
          <Badge variant="outline" className="border-primary/40 text-primary gap-1">
            <Spinner className="size-3" />
            Running
          </Badge>
        );
      case "QUEUED":
        return (
          <Badge variant="outline" className="border-muted-foreground/40 text-muted-foreground gap-1">
            <ClockIcon className="size-3" />
            Queued
          </Badge>
        );
      default:
        return null;
    }
  };

  const renderCheckIcon = (status: string) => {
    switch (status) {
      case "PASSED":
        return <CheckCircle2Icon className="size-3.5 text-success shrink-0" />;
      case "FAILED":
        return <XCircleIcon className="size-3.5 text-destructive shrink-0" />;
      case "WARNING":
        return <AlertCircleIcon className="size-3.5 text-warning shrink-0" />;
      default:
        return <MinusCircleIcon className="size-3.5 text-muted-foreground shrink-0" />;
    }
  };

  return (
    <div className="flex flex-col gap-3 p-3.5 rounded-lg border border-border bg-card text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground text-xs uppercase tracking-wider">
            Fix Validation
          </span>
          {validation && renderStatusBadge(validation.status)}
        </div>

        {validation && (
          <span className="text-[11px] font-medium text-muted-foreground">
            {validation.testsRun ? "Tests were run" : "Tests were NOT run"}
          </span>
        )}
      </div>

      {/* Trigger Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border/50">
        <div className="flex items-center space-x-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <span className="inline-flex items-center gap-2">
                    <Checkbox
                      id="also-run-tests"
                      checked={runTestsChecked && sandboxEnabled}
                      disabled={!sandboxEnabled || isRunning}
                      onCheckedChange={(c) => setRunTestsChecked(Boolean(c))}
                    />
                    <label
                      htmlFor="also-run-tests"
                      className={`text-xs font-medium cursor-pointer ${
                        !sandboxEnabled ? "text-muted-foreground" : "text-foreground"
                      }`}
                    >
                      Also run tests
                    </label>
                  </span>
                }
              />
              {!sandboxEnabled && (
                <TooltipContent className="max-w-xs text-xs">
                  {isOwnerOrAdmin ? (
                    <span>
                      Test runs are disabled. Enable them in{" "}
                      <Link href="/settings" className="underline font-semibold">
                        Settings
                      </Link>
                      .
                    </span>
                  ) : (
                    <span>Test runs are disabled in workspace settings.</span>
                  )}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>

        <Button
          size="sm"
          onClick={handleRunValidation}
          disabled={isRunning}
          className="h-7 text-xs font-medium gap-1.5"
        >
          {isRunning ? (
            <>
              <Spinner className="size-3" />
              Validating...
            </>
          ) : (
            <>
              <PlayIcon className="size-3" />
              Check this fix
            </>
          )}
        </Button>
      </div>

      {/* Error Alert */}
      {validation?.errorCode && ERROR_MESSAGES[validation.errorCode] && (
        <Alert variant="destructive" className="py-2 text-xs">
          <AlertTitle className="text-xs font-semibold">
            {ERROR_MESSAGES[validation.errorCode].title}
          </AlertTitle>
          <AlertDescription className="text-xs">
            {ERROR_MESSAGES[validation.errorCode].desc}
          </AlertDescription>
        </Alert>
      )}

      {/* Layer 1: Static Checks */}
      {validation?.staticChecks && validation.staticChecks.length > 0 && (
        <div className="flex flex-col gap-1.5 pt-2 border-t border-border/50">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Static Checks
          </span>
          <div className="grid grid-cols-1 gap-1.5">
            {validation.staticChecks.map((check: StaticCheckItem, idx: number) => {
              const labelMap: Record<string, string> = {
                syntax: "Syntax",
                lint: "Lint comparison",
                secrets: "Secrets",
                risk: "Risk level",
              };
              const label = labelMap[check.name] || check.name;

              return (
                <div
                  key={idx}
                  className="flex items-start justify-between gap-2 p-1.5 rounded-sm bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    {renderCheckIcon(check.status)}
                    <span className="font-medium text-foreground">{label}</span>
                    <span className="text-muted-foreground text-[11px]">
                      — {check.note}
                    </span>
                  </div>
                  <span className="font-semibold text-[11px] uppercase tracking-wider">
                    {check.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Layer 2: Test Stepper (only if tests ran) */}
      {validation?.testsRun && validation.testSteps && validation.testSteps.length > 0 && (
        <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Container Test Steps
            </span>
            {validation.nodeVersion && (
              <span className="font-mono text-[11px] text-muted-foreground">
                Node {validation.nodeVersion}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            {validation.testSteps.map((step: TestStepItem, idx: number) => {
              const stepNameMap: Record<string, string> = {
                install: "Install",
                lint: "Lint",
                typecheck: "Type check",
                test: "Test",
              };
              const stepName = stepNameMap[step.name] || step.name;

              return (
                <div
                  key={idx}
                  className="rounded-md border border-border/60 bg-muted/20 p-2 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      {renderCheckIcon(step.status)}
                      <span className="font-medium text-foreground">{stepName}</span>
                      {step.durationMs > 0 && (
                        <span className="text-muted-foreground text-[11px]">
                          ({step.durationMs}ms)
                        </span>
                      )}
                    </div>
                    <span className="font-semibold text-[11px] uppercase tracking-wider">
                      {step.status}
                    </span>
                  </div>

                  {step.note && (
                    <p className="text-[11px] text-muted-foreground italic pl-5.5">
                      {step.note}
                    </p>
                  )}

                  {step.outputTail && step.outputTail.trim().length > 0 && (
                    <Accordion className="w-full pl-5.5">
                      <AccordionItem value={`output-${idx}`} className="border-none">
                        <AccordionTrigger className="py-1 text-[11px] text-muted-foreground hover:no-underline hover:text-foreground">
                          <span className="flex items-center gap-1 font-mono">
                            <TerminalIcon className="size-3" />
                            View command output
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="pt-1 pb-0">
                          <pre className="p-2 rounded bg-muted/60 font-mono text-[10px] leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-48">
                            {step.outputTail}
                          </pre>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
