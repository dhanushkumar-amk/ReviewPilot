"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export interface PageTab {
  label: string;
  href: string;
}

interface PageHeaderProps extends React.ComponentProps<"div"> {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  showTabs?: boolean;
  tabs?: PageTab[];
  activeTabHref?: string;
}

const defaultTabs: PageTab[] = [
  { label: "Overview", href: "/dashboard" },
  { label: "Repositories", href: "/repositories" },
  { label: "Scans", href: "/scans" },
  { label: "Findings", href: "/findings" },
  { label: "Rules", href: "/rules" },
  { label: "Settings", href: "/settings" },
];

export function PageHeader({
  title,
  description,
  actions,
  showTabs = true,
  tabs = defaultTabs,
  activeTabHref,
  className,
  ...props
}: PageHeaderProps) {
  const pathname = usePathname();

  return (
    <div className={cn("flex flex-col gap-4", className)} {...props}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>

      {showTabs && tabs.length > 0 ? (
        <nav
          aria-label="Section navigation"
          className="flex items-center gap-1 overflow-x-auto border-b border-border"
        >
          {tabs.map((tab) => {
            const isActive = activeTabHref
              ? activeTabHref === tab.href
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                  isActive
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
