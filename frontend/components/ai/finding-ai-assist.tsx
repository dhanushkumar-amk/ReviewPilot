"use client";

import * as React from "react";
import {
  AlertCircleIcon,
  BotIcon,
  CheckCircle2Icon,
  CheckIcon,
  InfoIcon,
  ShieldAlertIcon,
  SparklesIcon,
  Wand2Icon,
  XCircleIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { MarkdownView } from "@/components/markdown-view";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    <div className="flex flex-col gap-4 border-t border-border/80 pt-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-md bg-primary/10 text-primary flex items-center justify-center">
            <SparklesIcon className="size-3.5" />
          </div>
          <div>
            <div className="font-semibold text-xs uppercase tracking-wider text-foreground">AI Remediation</div>
            <p className="text-[11px] text-muted-foreground">Automated explanations & fix proposals</p>
          </div>
        </div>
        {aiEnabled && (
          <Badge variant="outline" className="text-xs font-normal text-muted-foreground bg-muted/30">
            AI Active
          </Badge>
        )}
      </div>

      {!aiEnabled ? (
        <Alert variant="default" className="bg-muted/30 border-dashed">
          <InfoIcon />
          <AlertTitle className="text-xs font-medium">AI Assist is off</AlertTitle>
          <AlertDescription className="text-xs text-muted-foreground">
            {isOwnerOrAdmin ? (
              <div className="flex flex-col gap-2 pt-1.5">
                <span>
                  Enable AI assist to generate automated explanations and draft code remediations.
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-fit h-7 text-xs"
                  onClick={() => setDisclosureOpen(true)}
                >
                  <SparklesIcon data-icon="inline-start" className="size-3" />
                  Enable AI Assist
                </Button>
              </div>
            ) : (
              <span>Ask a workspace owner to enable AI assist.</span>
            )}
          </AlertDescription>
        </Alert>
      ) : (
        <div className="flex flex-col gap-4">
          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle className="text-xs">AI Assist Error</AlertTitle>
              <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Action trigger buttons */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs font-medium"
              disabled={explainMutation.isPending}
              onClick={handleExplain}
            >
              {explainMutation.isPending ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <BotIcon data-icon="inline-start" className="size-3.5" />
              )}
              {explanation ? "Re-explain" : "Explain finding"}
            </Button>

            {!isSecret && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs font-medium"
                disabled={draftFixMutation.isPending || finding.status === "FIXED"}
                onClick={handleDraftFix}
              >
                {draftFixMutation.isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <Wand2Icon data-icon="inline-start" className="size-3.5 text-primary" />
                )}
                {fixProposal ? "Re-draft fix" : "Draft a fix"}
              </Button>
            )}
          </div>

          {/* Explanation Output */}
          {explanation && (
            <Card className="border border-border/80 shadow-2xs overflow-hidden">
              <CardHeader className="py-2.5 px-4 bg-muted/30 border-b border-border/60 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <BotIcon className="size-3.5 text-primary" />
                  <CardTitle className="text-xs font-semibold text-foreground">
                    Explanation
                  </CardTitle>
                </div>
                <div className="flex items-center gap-1.5">
                  {explanation.cached && (
                    <Badge variant="outline" className="text-[10px] h-4.5 px-1.5 text-muted-foreground">
                      Cached
                    </Badge>
                  )}
                  {explanation.redacted && (
                    <Badge variant="outline" className="text-[10px] h-4.5 px-1.5 text-muted-foreground">
                      Redacted
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-3 flex flex-col gap-3 text-xs">
                <Tabs defaultValue="summary" className="w-full">
                  <TabsList className="w-full grid grid-cols-3 h-7 p-0.5 bg-muted/60">
                    <TabsTrigger value="summary" className="text-[11px] py-1">
                      Summary
                    </TabsTrigger>
                    <TabsTrigger value="risk" className="text-[11px] py-1">
                      Why it matters
                    </TabsTrigger>
                    <TabsTrigger value="fix" className="text-[11px] py-1">
                      How to fix
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="summary" className="pt-3 text-foreground leading-relaxed">
                    <MarkdownView>{explanation.summary}</MarkdownView>
                  </TabsContent>
                  <TabsContent value="risk" className="pt-3 text-foreground leading-relaxed">
                    <MarkdownView>{explanation.whyItMatters}</MarkdownView>
                  </TabsContent>
                  <TabsContent value="fix" className="pt-3 text-foreground leading-relaxed">
                    <MarkdownView>{explanation.howToFix}</MarkdownView>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {/* Cannot fix message */}
          {canFixOutcome && (
            <Alert variant="default" className="bg-muted/20 border-dashed">
              <InfoIcon />
              <AlertTitle className="text-xs">No Automated Fix Available</AlertTitle>
              <AlertDescription className="text-xs text-muted-foreground">{canFixOutcome}</AlertDescription>
            </Alert>
          )}

          {/* Fix Proposal Output */}
          {fixProposal && (
            <Card className="border border-border/80 shadow-2xs overflow-hidden">
              <CardHeader className="py-2.5 px-4 bg-muted/30 border-b border-border/60 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wand2Icon className="size-3.5 text-primary" />
                  <CardTitle className="text-xs font-semibold text-foreground">
                    Remediation Patch
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className="text-[10px] h-4.5 px-1.5"
                  >
                    {fixProposal.confidence.toLowerCase()} confidence
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[11px] text-muted-foreground hover:text-destructive"
                  disabled={discardMutation.isPending}
                  onClick={() => handleDiscard(fixProposal.id)}
                >
                  Discard
                </Button>
              </CardHeader>
              <CardContent className="p-4 flex flex-col gap-3.5">
                <p className="text-xs text-foreground/90 leading-relaxed bg-muted/20 p-2.5 rounded-md border border-border/60">
                  {fixProposal.explanation}
                </p>

                {/* Diff Viewer with semantic styling */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Proposed Diff
                  </span>
                  <div className="rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs overflow-x-auto leading-snug">
                    {fixProposal.diff.split("\n").map((line, idx) => {
                      const isAdded = line.startsWith("+") && !line.startsWith("+++");
                      const isRemoved = line.startsWith("-") && !line.startsWith("---");
                      const isHunk = line.startsWith("@@");

                      return (
                        <div
                          key={idx}
                          className={
                            isAdded
                              ? "bg-success/15 text-success px-1.5 py-0.5 rounded-xs"
                              : isRemoved
                                ? "bg-destructive/15 text-destructive px-1.5 py-0.5 rounded-xs"
                                : isHunk
                                  ? "text-muted-foreground italic py-0.5"
                                  : "text-foreground px-1.5 py-0.5"
                          }
                        >
                          {line}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Checks List */}
                <div className="flex flex-col gap-2 p-3 rounded-lg border border-border/70 bg-card text-xs">
                  <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider">
                    Safety & Static Verification
                  </span>
                  <div className="grid grid-cols-1 gap-1.5 pt-0.5">
                    <div className="flex items-center gap-2">
                      {fixProposal.checks.patchApplies ? (
                        <CheckCircle2Icon className="size-3.5 text-success shrink-0" />
                      ) : (
                        <XCircleIcon className="size-3.5 text-destructive shrink-0" />
                      )}
                      <span>Patch applies cleanly</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {fixProposal.checks.withinFile ? (
                        <CheckCircle2Icon className="size-3.5 text-success shrink-0" />
                      ) : (
                        <XCircleIcon className="size-3.5 text-destructive shrink-0" />
                      )}
                      <span>Confined to target file boundary</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {fixProposal.checks.sizeOk ? (
                        <CheckCircle2Icon className="size-3.5 text-success shrink-0" />
                      ) : (
                        <XCircleIcon className="size-3.5 text-destructive shrink-0" />
                      )}
                      <span>Replacement size within allowed limits</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {fixProposal.checks.staticRecheck?.findingGone ? (
                        <CheckCircle2Icon className="size-3.5 text-success shrink-0" />
                      ) : (
                        <XCircleIcon className="size-3.5 text-destructive shrink-0" />
                      )}
                      <span>Static re-check: original finding resolved</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {!fixProposal.checks.staticRecheck?.newIssues ? (
                        <CheckCircle2Icon className="size-3.5 text-success shrink-0" />
                      ) : (
                        <XCircleIcon className="size-3.5 text-destructive shrink-0" />
                      )}
                      <span>Static re-check: no new high-severity issues</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/60">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <span className="inline-flex cursor-not-allowed">
                            <Button size="sm" disabled className="h-8 text-xs font-medium">
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

