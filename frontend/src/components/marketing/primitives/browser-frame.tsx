import * as React from "react";
import { cn } from "@/lib/utils";

interface BrowserFrameProps {
  url?: string;
  className?: string;
  children: React.ReactNode;
}

export function BrowserFrame({
  url = "reviewpilot.dev/findings",
  className,
  children,
}: BrowserFrameProps) {
  return (
    <div
      className={cn(
        "w-full rounded-lg border border-border bg-card overflow-hidden text-card-foreground select-none",
        className
      )}
    >
      {/* Chrome header */}
      <div className="flex h-10 items-center justify-between border-b border-border bg-muted/50 px-3 sm:px-4 gap-2">
        {/* 3 solid window control dots (10px) */}
        <div className="flex items-center gap-1.5 shrink-0" aria-hidden="true">
          <div className="size-2.5 rounded-full bg-border" />
          <div className="size-2.5 rounded-full bg-border" />
          <div className="size-2.5 rounded-full bg-border" />
        </div>

        {/* Address bar */}
        <div className="flex flex-1 max-w-sm mx-auto items-center justify-center rounded border border-border bg-background px-3 py-1 font-mono text-[11px] text-muted-foreground truncate">
          <span className="truncate">{url}</span>
        </div>

        <div className="w-12 shrink-0" aria-hidden="true" />
      </div>

      {/* Frame content */}
      <div className="relative w-full overflow-hidden">{children}</div>
    </div>
  );
}

