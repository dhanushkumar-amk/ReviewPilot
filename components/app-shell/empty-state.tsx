import * as React from "react";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
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
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn("rounded-xl border border-dashed border-border bg-card p-8", className)}
      {...props}
    >
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            {icon ?? <InboxIcon className="size-4" />}
          </EmptyMedia>
          <EmptyTitle>{title}</EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
        </EmptyHeader>
        {action && <EmptyContent>{action}</EmptyContent>}
      </Empty>
    </div>
  );
}

