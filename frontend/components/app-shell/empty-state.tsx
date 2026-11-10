import * as React from "react";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { InboxIcon } from "lucide-react";
import { cn } from "cn";

interface EmptyStateProps extends React.ComponentProps<"div"> {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  iconClassName?: string;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  iconClassName,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[380px] w-full items-center justify-center rounded-xl border border-dashed border-border bg-card p-8 sm:p-12 text-center",
        className
      )}
      {...props}
    >
      <Empty className="max-w-md mx-auto flex flex-col items-center">
        <EmptyHeader className="max-w-md items-center">
          <div
            className={cn(
              "mb-4 flex size-14 shrink-0 items-center justify-center rounded-2xl border border-border bg-muted/70 text-foreground/80 shadow-xs",
              iconClassName
            )}
          >
            {icon ?? <InboxIcon className="size-7 text-muted-foreground" />}
          </div>
          <EmptyTitle className="text-base font-semibold text-foreground tracking-tight">
            {title}
          </EmptyTitle>
          <EmptyDescription className="text-sm text-muted-foreground leading-relaxed mt-1">
            {description}
          </EmptyDescription>
        </EmptyHeader>
        {action && <EmptyContent className="mt-4">{action}</EmptyContent>}
      </Empty>
    </div>
  );
}
