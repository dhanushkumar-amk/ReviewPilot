"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

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
  { label: "Scans", href: "/scans" },
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold leading-9 tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="text-sm leading-5 text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>

      {showTabs && tabs && tabs.length > 0 && (
        <div className="border-b border-border -mb-2">
          <nav
            className="flex items-center gap-6 -mb-px"
            aria-label="Section navigation"
          >
            {tabs.map((tab) => {
              const isActive = activeTabHref
                ? activeTabHref === tab.href
                : pathname === tab.href ||
                  (pathname.startsWith("/findings") && tab.href === "/dashboard");

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative pb-3 text-sm font-medium transition-colors border-b-2 outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                    isActive
                      ? "border-primary text-foreground font-semibold"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}
