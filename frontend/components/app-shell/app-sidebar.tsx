"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CommandPalette } from "./command-palette";
import { cn } from "cn";
import {
  LayoutDashboardIcon,
  FolderCodeIcon,
  ScanLineIcon,
  ShieldAlertIcon,
  GitPullRequestIcon,
  SettingsIcon,
  CreditCardIcon,
  ChevronsUpDownIcon,
  SearchIcon,
  CheckIcon,
  UsersIcon,
} from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType;
  badge?: string;
}

const platformItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboardIcon,
  },
  {
    title: "Repositories",
    href: "/repositories",
    icon: FolderCodeIcon,
  },
  {
    title: "Scans",
    href: "/scans",
    icon: ScanLineIcon,
  },
  {
    title: "Findings",
    href: "/findings",
    icon: ShieldAlertIcon,
  },
  {
    title: "Pull requests",
    href: "/pull-requests",
    icon: GitPullRequestIcon,
    badge: "New",
  },
];

const accountItems: NavItem[] = [
  {
    title: "Team",
    href: "/team",
    icon: UsersIcon,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: SettingsIcon,
  },
  {
    title: "Billing",
    href: "/billing",
    icon: CreditCardIcon,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [commandOpen, setCommandOpen] = React.useState(false);
  const [workspace, setWorkspace] = React.useState("ReviewPilot Production");

  return (
    <>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
        {/* Workspace Switcher Header */}
        <SidebarHeader className="border-b border-sidebar-border p-2.5 flex flex-col gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex w-full items-center justify-between gap-2 rounded-lg border border-sidebar-border bg-card p-1.5 text-left text-sm font-medium hover:bg-sidebar-accent transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 group-data-[collapsible=icon]:p-1 group-data-[collapsible=icon]:justify-center"
              aria-label="Switch workspace"
            >
              <div className="flex items-center gap-2 truncate">
                <div className="size-6 shrink-0 rounded-md bg-foreground text-background flex items-center justify-center font-mono text-[11px] font-bold tracking-tight shadow-xs">
                  RP
                </div>
                <div className="flex flex-col truncate leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="text-xs font-semibold text-sidebar-foreground truncate">
                    {workspace}
                  </span>
                  <span className="text-[11px] text-muted-foreground truncate">
                    Enterprise
                  </span>
                </div>
              </div>
              <ChevronsUpDownIcon className="size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => setWorkspace("ReviewPilot Production")}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <span>ReviewPilot Production</span>
                  {workspace === "ReviewPilot Production" && (
                    <CheckIcon data-icon="inline-end" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setWorkspace("ReviewPilot Staging")}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <span>ReviewPilot Staging</span>
                  {workspace === "ReviewPilot Staging" && (
                    <CheckIcon data-icon="inline-end" />
                  )}
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <div className="h-px bg-border my-1" />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  render={<Link href="/team" />}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <UsersIcon className="size-4" />
                  <span>Manage team</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Search Command Palette Trigger */}
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="flex w-full items-center justify-between rounded-lg border border-sidebar-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 group-data-[collapsible=icon]:p-1.5 group-data-[collapsible=icon]:justify-center cursor-pointer"
            aria-label="Open search command palette"
          >
            <div className="flex items-center gap-2">
              <SearchIcon className="size-4 shrink-0" />
              <span className="group-data-[collapsible=icon]:hidden">Search views...</span>
            </div>
            <kbd className="pointer-events-none inline-flex h-4 items-center rounded border border-border bg-muted px-1 font-mono text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden">
              ⌘K
            </kbd>
          </button>
        </SidebarHeader>

        {/* Grouped Nav Items */}
        <SidebarContent className="p-2 gap-4">
          {/* Platform Group */}
          <SidebarGroup className="p-0">
            <SidebarGroupLabel className="text-xs font-medium text-muted-foreground px-2">
              Platform
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu aria-label="Platform navigation">
                {platformItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        render={<Link href={item.href} />}
                        isActive={isActive}
                        aria-current={isActive ? "page" : undefined}
                        tooltip={item.title}
                        className={cn(
                          "relative transition-colors flex items-center justify-between",
                          isActive
                            ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground pl-3.5"
                            : "text-sidebar-foreground hover:bg-sidebar-accent"
                        )}
                      >
                        {/* 3px orange active marker with clean breathing room */}
                        {isActive && (
                          <span
                            className="absolute left-0 inset-y-1 rounded-r-full bg-primary"
                            style={{ width: "3px" }}
                            aria-hidden="true"
                          />
                        )}
                        <div className="flex items-center gap-2 truncate">
                          <Icon />
                          <span className="group-data-[collapsible=icon]:hidden truncate">
                            {item.title}
                          </span>
                        </div>
                        {item.badge && (
                          <Badge
                            variant="secondary"
                            className="ml-auto text-[10px] px-1.5 py-0 group-data-[collapsible=icon]:hidden"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Account Group */}
          <SidebarGroup className="p-0">
            <SidebarGroupLabel className="text-xs font-medium text-muted-foreground px-2">
              Account
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu aria-label="Account navigation">
                {accountItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        render={<Link href={item.href} />}
                        isActive={isActive}
                        aria-current={isActive ? "page" : undefined}
                        tooltip={item.title}
                        className={cn(
                          "relative transition-colors flex items-center justify-between",
                          isActive
                            ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground pl-3.5"
                            : "text-sidebar-foreground hover:bg-sidebar-accent"
                        )}
                      >
                        {/* 3px orange active marker */}
                        {isActive && (
                          <span
                            className="absolute left-0 inset-y-1 rounded-r-full bg-primary"
                            style={{ width: "3px" }}
                            aria-hidden="true"
                          />
                        )}
                        <div className="flex items-center gap-2 truncate">
                          <Icon />
                          <span className="group-data-[collapsible=icon]:hidden truncate">
                            {item.title}
                          </span>
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Footer with Docs/Support links, Avatar, User Info, and Collapse Trigger */}
        <SidebarFooter className="border-t border-sidebar-border p-2 flex flex-col gap-2">
          {/* Docs and Support muted links above user block */}
          <div className="flex items-center gap-3 px-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
            <Link
              href="/docs"
              className="hover:text-foreground transition-colors underline-offset-2 hover:underline"
            >
              Docs
            </Link>
            <span className="text-border" aria-hidden="true">
              •
            </span>
            <Link
              href="/support"
              className="hover:text-foreground transition-colors underline-offset-2 hover:underline"
            >
              Support
            </Link>
          </div>

          <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:justify-center">
            <div className="flex items-center gap-2.5 min-w-0 group-data-[collapsible=icon]:hidden">
              <Avatar className="size-8 shrink-0">
                <AvatarFallback>AR</AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0 leading-tight">
                <span className="text-xs font-semibold text-sidebar-foreground truncate">
                  Alex Rivera
                </span>
                <span className="text-[11px] text-muted-foreground truncate">
                  alex@reviewpilot.io
                </span>
              </div>
            </div>
            <SidebarTrigger aria-label="Toggle sidebar collapse" />
          </div>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </>
  );
}
