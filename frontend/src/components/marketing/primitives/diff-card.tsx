import * as React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2Icon } from "lucide-react";

interface DiffCardProps {
  className?: string;
  file?: string;
  oldLine?: string;
  newLine?: string;
  testStatus?: string;
}

export function DiffCard({
  className,
  file = "src/db/query-builder.ts",
  oldLine = '- const query = `SELECT * FROM users WHERE id = ${userId}`;',
  newLine = "+ const query = sql`SELECT * FROM users WHERE id = ${userId}`;",
  testStatus = "Tests passed (14/14 in sandbox)",
}: DiffCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-3 sm:p-4 font-mono text-xs text-foreground flex flex-col gap-2.5",
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-border pb-2 text-[11px] text-muted-foreground">
        <span className="truncate">{file}</span>
        <span className="text-muted-foreground/70 shrink-0">diff -u</span>
      </div>

      <div className="flex flex-col gap-1 overflow-x-auto text-[11px] leading-relaxed">
        <div className="rounded bg-destructive/10 px-2 py-1 text-destructive whitespace-pre font-mono">
          {oldLine}
        </div>
        <div className="rounded bg-success/10 px-2 py-1 text-success whitespace-pre font-mono">
          {newLine}
        </div>
      </div>

      <div className="flex items-center gap-1.5 pt-1 text-[11px] text-success font-medium">
        <CheckCircle2Icon className="size-3.5 shrink-0" />
        <span>{testStatus}</span>
      </div>
    </div>
  );
}
