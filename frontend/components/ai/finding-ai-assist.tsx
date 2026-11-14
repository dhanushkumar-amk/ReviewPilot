"use client";

import * as React from "react";
import {
  AlertCircleIcon,
  BotIcon,
  CheckIcon,
  InfoIcon,
  SparklesIcon,
  Wand2Icon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { MarkdownView } from "@/components/markdown-view";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AiDisclosureDialog } from "@/components/ai/ai-disclosure-dialog";
import {
  useAiSettings,
  useDiscardProposal,
  useDraftFix,
  useExplainFinding,
  type ExplainResult,
  type FixProposal,
} from "@/src/features/ai/use-ai";
import { useWorkspace } from "@/src/features/me/use-me";
import type { FindingItem } from "@/src/features/findings/use-findings";

interface FindingAiAssistProps {
  finding: FindingItem;
}

export function FindingAiAssist({ finding }: FindingAiAssistProps) {
  const { activeWorkspace } = useWorkspace();
  const role = activeWorkspace?.role?.trim().toLowerCase();
  const isOwnerOrAdmin = role === "owner" || role === "admin";

  const aiSettingsQuery = useAiSettings();
  const explainMutation = useExplainFinding();
  const draftFixMutation = useDraftFix();
  const discardMutation = useDiscardProposal();

  const [disclosureOpen, setDisclosureOpen] = React.useState(false);
  const [explanation, setExplanation] = React.useState<ExplainResult | null>(null);
  const [fixProposal, setFixProposal] = React.useState<FixProposal | null>(null);
  const [canFixOutcome, setCanFixOutcome] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const aiEnabled = aiSettingsQuery.data?.aiEnabled ?? false;
  const isSecret = finding.category === "SECRET";

  const handleExplain = async () => {
    setErrorMessage(null);
    try {
      const res = await explainMutation.mutateAsync(finding.id);
      setExplanation(res);
    } catch (err: unknown) {
      handleAiError(err);
    }
  };

  const handleDraftFix = async () => {
    setErrorMessage(null);
    setCanFixOutcome(null);
    try {
      const res = await draftFixMutation.mutateAsync(finding.id);
      if (res.canFix && res.fixProposal) {
        setFixProposal(res.fixProposal);
      } else {
        setCanFixOutcome(res.explanation || "No automatic fix could be determined safely.");
      }
    } catch (err: unknown) {
      handleAiError(err);
    }
  };

  const handleDiscard = async (proposalId: string) => {
    try {
      await discardMutation.mutateAsync(proposalId);
      setFixProposal(null);
      toast.success("Fix draft discarded");
    } catch {
      toast.error("Failed to discard fix draft");
    }
  };

  const handleAiError = (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err || "");
    if (msg.includes("AI_LIMIT_REACHED")) {
      setErrorMessage("Daily AI limit reached for this workspace. Try again tomorrow.");
    } else if (msg.includes("AI_BUSY") || msg.includes("AI_UNAVAILABLE")) {
      setErrorMessage("AI providers are busy. Try again in a minute.");
    } else if (msg.includes("AI_INVALID_OUTPUT")) {
      setErrorMessage("The AI answer could not be used. Try again.");
    } else if (msg.includes("AI_DISABLED")) {
      setErrorMessage("AI assist is disabled for this workspace.");
    } else {
      setErrorMessage("Unable to complete AI assist request. Please try again.");
    }
  };

  return (
    <div className="flex flex-col gap-4 border-t pt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-semibold text-sm text-foreground">
          <BotIcon className="size-4 text-link" />
          AI Assist
        </div>
        {aiEnabled && (
          <Badge variant="secondary" className="text-xs">
            Enabled
          </Badge>
        )}
      </div>

      {!aiEnabled ? (
        <Alert variant="default" className="bg-muted/40">
          <InfoIcon />
          <AlertTitle>AI Assist is off</AlertTitle>
          <AlertDescription className="text-xs">
            {isOwnerOrAdmin ? (
              <div className="flex flex-col gap-2 pt-1">
                <span>
                  Enable AI assist to generate automated explanations and draft code
                  remediations.
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-fit"
                  onClick={() => setDisclosureOpen(true)}
                >
                  <SparklesIcon data-icon="inline-start" />
                  Enable AI Assist
                </Button>
              </div>
            ) : (
              <span>Ask a workspace owner to enable AI assist.</span>
            )}
          </AlertDescription>
        </Alert>
      ) : (
        <div className="flex flex-col gap-3">
          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>AI Assist Error</AlertTitle>
              <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Action trigger buttons */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={explainMutation.isPending}
              onClick={handleExplain}
            >
              {explainMutation.isPending ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <BotIcon data-icon="inline-start" />
              )}
              Explain this finding
            </Button>

            {!isSecret && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={draftFixMutation.isPending || finding.status === "FIXED"}
                onClick={handleDraftFix}
              >
                {draftFixMutation.isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <Wand2Icon data-icon="inline-start" />
                )}
                Draft a fix
              </Button>
            )}
          </div>

          {/* Explanation Output */}
          {explanation && (
            <Card className="bg-muted/30">
              <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  AI Explanation
                </CardTitle>
                <div className="flex items-center gap-2">
                  {explanation.cached && (
                    <Badge variant="outline" className="text-xs h-5">
                      Cached
                    </Badge>
                  )}
                  {explanation.redacted && (
                    <Badge variant="outline" className="text-xs h-5">
                      Redacted
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 flex flex-col gap-4 text-xs">
                <div>
                  <span className="font-semibold text-foreground block mb-1">
                    Summary
                  </span>
                  <MarkdownView>{explanation.summary}</MarkdownView>
                </div>
                <div>
                  <span className="font-semibold text-foreground block mb-1">
                    Why it matters
                  </span>
                  <MarkdownView>{explanation.whyItMatters}</MarkdownView>
                </div>
                <div>
                  <span className="font-semibold text-foreground block mb-1">
                    How to fix
                  </span>
                  <MarkdownView>{explanation.howToFix}</MarkdownView>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cannot fix message */}
          {canFixOutcome && (
            <Alert variant="default">
              <InfoIcon />
              <AlertTitle>No Automated Fix Available</AlertTitle>
              <AlertDescription className="text-xs">{canFixOutcome}</AlertDescription>
            </Alert>
          )}

          {/* Fix Proposal Output */}
          {fixProposal && (
            <Card className="border border-border">
              <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Fix Draft
                  </CardTitle>
                  <Badge
                    variant={
                      fixProposal.confidence === "HIGH"
                        ? "success"
                        : fixProposal.confidence === "MEDIUM"
                          ? "link"
                          : "outline"
                    }
                    className="text-xs h-5"
                  >
                    {fixProposal.confidence} confidence
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground"
                  disabled={discardMutation.isPending}
                  onClick={() => handleDiscard(fixProposal.id)}
                >
                  Discard
                </Button>
              </CardHeader>
              <CardContent className="p-4 flex flex-col gap-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {fixProposal.explanation}
                </p>

                {/* Diff Viewer with plain semantic styling */}
                <div className="rounded-md border bg-muted/60 p-3 font-mono text-xs overflow-x-auto leading-snug">
                  {fixProposal.diff.split("\n").map((line, idx) => {
                    const isAdded = line.startsWith("+") && !line.startsWith("+++");
                    const isRemoved = line.startsWith("-") && !line.startsWith("---");
                    const isHunk = line.startsWith("@@");

                    return (
                      <div
                        key={idx}
                        className={
                          isAdded
                            ? "bg-success/15 text-success px-1 rounded-xs"
                            : isRemoved
                              ? "bg-destructive/15 text-destructive px-1 rounded-xs"
                              : isHunk
                                ? "text-muted-foreground italic py-0.5"
                                : "text-foreground px-1"
                        }
                      >
                        {line}
                      </div>
                    );
                  })}
                </div>

                {/* Checks List */}
                <div className="flex flex-col gap-1.5 p-3 rounded-md border bg-card text-xs">
                  <span className="font-semibold text-foreground pb-1">
                    Verification Checks
                  </span>
                  <div className="flex items-center gap-2">
                    {fixProposal.checks.patchApplies ? (
                      <CheckIcon className="size-3.5 text-success" />
                    ) : (
                      <XIcon className="size-3.5 text-destructive" />
                    )}
                    <span>Patch applies cleanly</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {fixProposal.checks.withinFile ? (
                      <CheckIcon className="size-3.5 text-success" />
                    ) : (
                      <XIcon className="size-3.5 text-destructive" />
                    )}
                    <span>Stays within target file</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {fixProposal.checks.sizeOk ? (
                      <CheckIcon className="size-3.5 text-success" />
                    ) : (
                      <XIcon className="size-3.5 text-destructive" />
                    )}
                    <span>Replacement size within limits</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {fixProposal.checks.staticRecheck?.findingGone ? (
                      <CheckIcon className="size-3.5 text-success" />
                    ) : (
                      <XIcon className="size-3.5 text-destructive" />
                    )}
                    <span>Static re-check: original finding resolved</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!fixProposal.checks.staticRecheck?.newIssues ? (
                      <CheckIcon className="size-3.5 text-success" />
                    ) : (
                      <XIcon className="size-3.5 text-destructive" />
                    )}
                    <span>Static re-check: no new high-severity issues</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <span className="inline-flex cursor-not-allowed">
                            <Button size="sm" disabled>
                              Create pull request
                            </Button>
                          </span>
                        }
                      />
                      <TooltipContent>Coming in a later step</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <AiDisclosureDialog
        open={disclosureOpen}
        onOpenChange={setDisclosureOpen}
        onSuccess={() => void aiSettingsQuery.refetch()}
      />
    </div>
  );
}

