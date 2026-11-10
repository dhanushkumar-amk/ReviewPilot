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
import { CommandPalette } from "./command-palette";
import {
  LayoutDashboardIcon,
  FolderGit2Icon,
  ScanSearchIcon,
  ShieldAlertIcon,
  GitPullRequestIcon,
  SettingsIcon,
  ChevronsUpDownIcon,
  SearchIcon,
  CheckIcon,
} from "lucide-react";

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboardIcon,
  },
  {
    title: "Repositories",
    href: "/repositories",
    icon: FolderGit2Icon,
  },
  {
    title: "Scans",
    href: "/scans",
    icon: ScanSearchIcon,
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
  },
  {
    title: "Settings",
    href: "/settings",
    icon: SettingsIcon,
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
                <div className="size-6 shrink-0 rounded-md bg-foreground text-background flex items-center justify-center text-xs font-semibold">
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
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Search Trigger */}
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="flex w-full items-center justify-between rounded-lg border border-sidebar-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 group-data-[collapsible=icon]:p-1.5 group-data-[collapsible=icon]:justify-center"
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
        <SidebarContent className="p-2">
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-medium text-muted-foreground px-2">
              Platform
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu aria-label="Main navigation">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        render={<Link href={item.href} />}
                        isActive={isActive}
                        aria-current={isActive ? "page" : undefined}
                        tooltip={item.title}
                        className="relative"
                      >
                        {/* 3px orange active marker */}
                        {isActive && (
                          <span
                            className="absolute left-0 top-1.5 bottom-1.5 rounded-r-xs bg-primary"
                            style={{ width: "3px" }}
                            aria-hidden="true"
                          />
                        )}
                        <Icon />
                        <span className="group-data-[collapsible=icon]:hidden truncate">
                          {item.title}
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Footer with Avatar, User Info, and Collapse Trigger */}
        <SidebarFooter className="border-t border-sidebar-border p-2">
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
