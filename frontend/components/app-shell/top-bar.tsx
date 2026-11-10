"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  UserIcon,
  SettingsIcon,
  LogOutIcon,
  ChevronDownIcon,
} from "lucide-react";

const routeNames: Record<string, string> = {
  "/dashboard": "Findings",
  "/repositories": "Repositories",
  "/scans": "Scans",
  "/findings": "Findings",
  "/pull-requests": "Pull requests",
  "/settings": "Settings",
};

export function TopBar() {
  const pathname = usePathname();
  const currentTitle = routeNames[pathname] ?? "Overview";

  return (
    <header className="flex h-14 w-full items-center justify-between border-b border-border bg-card px-4 sm:px-6 shrink-0">
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle button */}
        <SidebarTrigger
          aria-label="Toggle navigation menu"
          className="size-8 md:hidden"
        />

        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/dashboard" />}>
                ReviewPilot
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{currentTitle}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* User profile dropdown menu */}
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex items-center gap-2 rounded-full border border-border bg-card p-1 pr-2.5 text-left text-xs font-medium hover:bg-muted transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            aria-label="Open user profile menu"
          >
            <Avatar className="size-6 shrink-0">
              <AvatarFallback>AR</AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline font-medium text-foreground">
              Alex Rivera
            </span>
            <ChevronDownIcon className="size-3 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuGroup>
              <DropdownMenuItem className="cursor-pointer">
                <UserIcon data-icon="inline-start" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <SettingsIcon data-icon="inline-start" />
                <span>Settings</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem variant="destructive" className="cursor-pointer">
                <LogOutIcon data-icon="inline-start" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

