import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  description?: React.ReactNode;
  badge?: {
    label: string;
    variant?: React.ComponentProps<typeof Badge>["variant"];
  };
  icon?: LucideIcon;
  valueClassName?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  description,
  badge,
  icon: Icon,
  valueClassName,
  className,
}: StatCardProps) {
  return (
    <Card size="sm" className={className}>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle
          className={cn(
            "text-2xl font-semibold tracking-tight tabular-nums",
            valueClassName
          )}
        >
          {value}
        </CardTitle>
        {Icon || badge ? (
          <CardAction>
            {badge ? (
              <Badge variant={badge.variant ?? "secondary"}>{badge.label}</Badge>
            ) : Icon ? (
              <Icon className="size-4 text-muted-foreground" />
            ) : null}
          </CardAction>
        ) : null}
      </CardHeader>
      {description ? (
        <CardContent>
          <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
      ) : null}
    </Card>
  );
}

