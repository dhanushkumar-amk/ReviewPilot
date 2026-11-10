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
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  UserIcon,
  SettingsIcon,
  LogOutIcon,
  ChevronDownIcon,
  PlusIcon,
  HelpCircleIcon,
  BellIcon,
} from "lucide-react";

const routeNames: Record<string, string> = {
  "/dashboard": "Overview",
  "/findings": "Findings",
  "/repositories": "Repositories",
  "/scans": "Scans",
  "/rules": "Rules",
  "/pull-requests": "Pull requests",
  "/settings": "Settings",
  "/billing": "Billing",
  "/docs": "Documentation",
  "/support": "Support",
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

      {/* Right side controls: Add repository, Help, Notifications, User menu */}
      <div className="flex items-center gap-2">
        {/* Secondary outline "Add repository" button */}
        <Button
          variant="outline"
          size="sm"
          render={<Link href="/repositories" />}
          nativeButton={false}
          className="hidden sm:inline-flex"
        >
          <PlusIcon data-icon="inline-start" />
          <span>Add repository</span>
        </Button>

        {/* Help icon button linking to /docs */}
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                render={<Link href="/docs" />}
                nativeButton={false}
                aria-label="Documentation and help"
              />
            }
          >
            <HelpCircleIcon />
          </TooltipTrigger>
          <TooltipContent>Documentation & help</TooltipContent>
        </Tooltip>

        {/* Notification bell with static unread dot */}
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label="Notifications (1 unread)"
                className="relative"
              />
            }
          >
            <BellIcon />
            <span
              className="absolute top-2 right-2 size-2 rounded-full bg-destructive"
              aria-hidden="true"
            />
          </TooltipTrigger>
          <TooltipContent>Notifications</TooltipContent>
        </Tooltip>

        {/* User profile dropdown menu */}
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
              <DropdownMenuItem
                render={<Link href="/settings" />}
                className="cursor-pointer"
              >
                <UserIcon data-icon="inline-start" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                render={<Link href="/settings" />}
                className="cursor-pointer"
              >
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
