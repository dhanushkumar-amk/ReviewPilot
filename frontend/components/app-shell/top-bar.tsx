"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
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
  UsersIcon,
  CheckCheckIcon,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  getUserInitials,
  useInitialAuthUser,
} from "@/components/auth/auth-user-provider";
import { authClient } from "@/src/lib/auth-client";

const routeNames: Record<string, string> = {
  "/dashboard": "Overview",
  "/findings": "Findings",
  "/repositories": "Repositories",
  "/scans": "Scans",
  "/rules": "Rules",
  "/pull-requests": "Pull requests",
  "/team": "Team",
  "/settings": "Settings",
  "/billing": "Billing",
  "/docs": "Documentation",
  "/support": "Support",
};

const notificationsList = [
  {
    id: "n-1",
    title: "Critical SQL injection flagged",
    detail: "reviewpilot/core · PR #482 · 4m ago",
    href: "/findings?severity=Critical",
    unread: true,
  },
  {
    id: "n-2",
    title: "Scan #8942 completed cleanly",
    detail: "reviewpilot/web · 0 critical issues · 26m ago",
    href: "/scans",
    unread: true,
  },
  {
    id: "n-3",
    title: "Rule set CWE-347 updated",
    detail: "JWT strict algorithm enforcement enabled · 2h ago",
    href: "/rules",
    unread: false,
  },
];

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const initialUser = useInitialAuthUser();
  const currentUser = session?.user ?? initialUser;
  const displayName = currentUser?.name ?? "User";
  const displayEmail = currentUser?.email ?? "";
  const initials = getUserInitials(displayName, displayEmail);
  const [signingOut, setSigningOut] = React.useState(false);
  const [readIds, setReadIds] = React.useState<string[]>([]);
  const currentTitle = routeNames[pathname] ?? "Overview";
  const unreadCount = notificationsList.filter(
    (item) => item.unread && !readIds.includes(item.id)
  ).length;

  const handleSignOut = async () => {
    if (signingOut) {
      return;
    }

    setSigningOut(true);
    try {
      const { error } = await authClient.signOut();
      if (error) {
        toast.error(error.message || "Unable to sign out right now.");
        return;
      }
      router.replace("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <header className="flex h-14 w-full items-center justify-between border-b border-border bg-card px-4 sm:px-6 shrink-0">
      <div className="flex items-center gap-2">
        {/* Sidebar collapse toggle */}
        <SidebarTrigger aria-label="Toggle navigation menu" className="-ml-1" />
        <Separator orientation="vertical" className="mr-1 h-4" />

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

        {/* Team button */}
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                render={<Link href="/team" />}
                nativeButton={false}
                aria-label="Team members and seats"
              />
            }
          >
            <UsersIcon />
          </TooltipTrigger>
          <TooltipContent>Team</TooltipContent>
        </Tooltip>

        {/* Theme toggle (Light / Dark / System) */}
        <ThemeToggle />

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

        {/* Interactive Notification Feed */}
        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label={
                  unreadCount > 0
                    ? `Notifications (${unreadCount} unread)`
                    : "Notifications"
                }
                className="relative"
              />
            }
          >
            <BellIcon />
            {unreadCount > 0 ? (
              <span
                className="absolute top-2 right-2 size-2 rounded-full bg-primary"
                aria-hidden="true"
              />
            ) : null}
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <PopoverHeader className="flex flex-row items-center justify-between gap-2 p-3">
              <div className="flex items-center gap-2">
                <PopoverTitle>Notifications</PopoverTitle>
                {unreadCount > 0 ? (
                  <Badge variant="secondary">{unreadCount} new</Badge>
                ) : null}
              </div>
              {unreadCount > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() =>
                    setReadIds(notificationsList.map((item) => item.id))
                  }
                >
                  <CheckCheckIcon data-icon="inline-start" />
                  Mark read
                </Button>
              ) : null}
            </PopoverHeader>
            <Separator />
            <div className="flex flex-col divide-y divide-border">
              {notificationsList.map((item) => {
                const isUnread = item.unread && !readIds.includes(item.id);
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() =>
                      setReadIds((prev) =>
                        prev.includes(item.id) ? prev : [...prev, item.id]
                      )
                    }
                    className="flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted"
                  >
                    <span
                      className={`mt-1.5 size-2 shrink-0 rounded-full ${
                        isUnread ? "bg-primary" : "bg-muted-foreground/30"
                      }`}
                      aria-hidden="true"
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-xs font-medium text-foreground">
                        {item.title}
                      </span>
                      <PopoverDescription className="truncate text-xs">
                        {item.detail}
                      </PopoverDescription>
                    </div>
                  </Link>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>

        {/* User profile dropdown menu */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex items-center gap-2 rounded-full border border-border bg-card p-1 pr-2.5 text-left text-xs font-medium hover:bg-muted transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            aria-label="Open user profile menu"
          >
            <Avatar className="size-6 shrink-0">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline font-medium text-foreground">
              {displayName}
            </span>
            <ChevronDownIcon className="size-3 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
                <span className="truncate font-semibold text-foreground">
                  {displayName}
                </span>
                {displayEmail ? (
                  <span className="truncate text-xs text-muted-foreground">
                    {displayEmail}
                  </span>
                ) : null}
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                render={<Link href="/team" />}
                className="cursor-pointer"
              >
                <UsersIcon data-icon="inline-start" />
                <span>Team</span>
              </DropdownMenuItem>
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
              <DropdownMenuItem
                variant="destructive"
                className="cursor-pointer"
                disabled={signingOut}
                onClick={handleSignOut}
              >
                <LogOutIcon data-icon="inline-start" />
                <span>{signingOut ? "Signing out..." : "Sign out"}</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
