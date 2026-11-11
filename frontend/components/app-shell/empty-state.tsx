import * as React from "react";
import { FolderSearchIcon } from "lucide-react";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

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
    <Empty
      className={cn("min-h-[320px] border bg-card", className)}
      {...props}
    >
      <EmptyHeader>
        <EmptyMedia variant="icon" className={cn(iconClassName)}>
          {icon ?? <FolderSearchIcon />}
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  );
}
