import * as React from "react";
import { cn } from "@/lib/utils";

export interface FindingRowData {
  id: string;
  ruleId: string;
  title: string;
  file: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  status: "Open" | "Triaged" | "In progress" | "Fixed";
}

interface FindingRowProps {
  finding: FindingRowData;
  className?: string;
  onAction?: () => void;
}

export function FindingRow({ finding, className, onAction }: FindingRowProps) {
  const severityBadge = (severity: FindingRowData["severity"]) => {
    const base =
      "inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[11px] font-medium min-w-[56px] border text-center";
    switch (severity) {
      case "Critical":
        return (
          <span
            className={cn(
              base,
              "border-destructive/20 bg-destructive/15 text-destructive"
            )}
          >
            Critical
          </span>
        );
      case "High":
        return (
          <span
            className={cn(base, "border-warning/20 bg-warning/15 text-warning")}
          >
            High
          </span>
        );
      case "Medium":
        return (
          <span className={cn(base, "border-border bg-muted text-muted-foreground")}>
            Medium
          </span>
        );
      case "Low":
        return (
          <span
            className={cn(
              base,
              "border-border bg-transparent text-muted-foreground"
            )}
          >
            Low
          </span>
        );
    }
  };

  const statusDot = (status: FindingRowData["status"]) => {
    switch (status) {
      case "Open":
        return "bg-destructive";
      case "Triaged":
        return "bg-warning";
      case "In progress":
        return "bg-link";
      case "Fixed":
        return "bg-success";
    }
  };

  return (
    <div
      onClick={onAction}
      className={cn(
        "flex h-11 items-center justify-between gap-3 border-b border-border bg-card px-3 text-xs text-foreground transition-colors hover:bg-muted/30 cursor-pointer",
        className
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className="shrink-0">{severityBadge(finding.severity)}</div>
        <span className="font-mono text-muted-foreground text-[11px] shrink-0">
          {finding.ruleId}
        </span>
        <span className="truncate font-medium">{finding.title}</span>
      </div>

      <div className="flex items-center gap-4 shrink-0 text-muted-foreground text-[11px]">
        <code className="hidden sm:inline font-mono truncate max-w-[160px]">
          {finding.file}
        </code>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={cn("size-2 rounded-full", statusDot(finding.status))}
            aria-hidden="true"
          />
          <span className="text-foreground">{finding.status}</span>
        </div>
      </div>
    </div>
  );
}

