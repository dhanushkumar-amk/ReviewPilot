"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BookOpenIcon,
  CheckIcon,
  ChevronsUpDownIcon,
  CreditCardIcon,
  FolderCodeIcon,
  GitPullRequestIcon,
  LayoutDashboardIcon,
  LifeBuoyIcon,
  LogOutIcon,
  ScanLineIcon,
  SearchIcon,
  SettingsIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";

import {
  getUserInitials,
  useInitialAuthUser,
} from "@/components/auth/auth-user-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { authClient } from "@/src/lib/auth-client";
import { CommandPalette } from "./command-palette";

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
    badge: "4",
  },
  {
    title: "Rules",
    href: "/rules",
    icon: ShieldCheckIcon,
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

const secondaryItems: NavItem[] = [
  {
    title: "Documentation",
    href: "/docs",
    icon: BookOpenIcon,
  },
  {
    title: "Support",
    href: "/support",
    icon: LifeBuoyIcon,
  },
];

const workspaces = [
  { name: "ReviewPilot", plan: "Production" },
  { name: "ReviewPilot", plan: "Staging" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const initialUser = useInitialAuthUser();
  const currentUser = session?.user ?? initialUser;
  const displayName = currentUser?.name ?? "User";
  const displayEmail = currentUser?.email ?? "";
  const initials = getUserInitials(displayName, displayEmail);

  const [commandOpen, setCommandOpen] = React.useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = React.useState(
    workspaces[0]
  );
  const [signingOut, setSigningOut] = React.useState(false);

  const handleSignOut = async () => {
    if (signingOut) return;
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
    <>
      <Sidebar collapsible="icon">
        {/* Workspace Switcher & Quick Search */}
        <SidebarHeader>
          <SidebarMenu className="gap-1.5">
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <SidebarMenuButton
                      size="lg"
                      tooltip={`${selectedWorkspace.name} (${selectedWorkspace.plan})`}
                      className="data-[popup-open]:bg-sidebar-accent data-[popup-open]:text-sidebar-accent-foreground"
                    />
                  }
                >
                  <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-mono text-xs font-bold">
                    RP
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {selectedWorkspace.name}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {selectedWorkspace.plan} · Enterprise
                    </span>
                  </div>
                  <ChevronsUpDownIcon className="ml-auto" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  side="right"
                  sideOffset={8}
                  className="w-56"
                >
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
                    {workspaces.map((ws) => {
                      const active = ws.plan === selectedWorkspace.plan;
                      return (
                        <DropdownMenuItem
                          key={ws.plan}
                          onClick={() => setSelectedWorkspace(ws)}
                          className="cursor-pointer"
                        >
                          <div className="flex flex-1 flex-col">
                            <span className="font-medium">{ws.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {ws.plan}
                            </span>
                          </div>
                          {active ? <CheckIcon data-icon="inline-end" /> : null}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      render={<Link href="/team" />}
                      className="cursor-pointer"
                    >
                      <UsersIcon />
                      <span>Manage team</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                variant="outline"
                onClick={() => setCommandOpen(true)}
                tooltip="Quick search (Ctrl+K)"
                className="text-muted-foreground"
              >
                <SearchIcon />
                <span>Quick search...</span>
                <KbdGroup className="ml-auto group-data-[collapsible=icon]:hidden">
                  <Kbd>Ctrl</Kbd>
                  <Kbd>K</Kbd>
                </KbdGroup>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        {/* Navigation Groups */}
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu aria-label="Platform navigation" className="gap-0.5">
                {platformItems.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        render={<Link href={item.href} />}
                        isActive={isActive}
                        aria-current={isActive ? "page" : undefined}
                        tooltip={item.title}
                        className="data-active:[&>svg]:text-primary"
                      >
                        <Icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                      {item.badge ? (
                        <SidebarMenuBadge className="rounded-md bg-muted text-muted-foreground">
                          {item.badge}
                        </SidebarMenuBadge>
                      ) : null}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Account</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu aria-label="Account navigation" className="gap-0.5">
                {accountItems.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        render={<Link href={item.href} />}
                        isActive={isActive}
                        aria-current={isActive ? "page" : undefined}
                        tooltip={item.title}
                        className="data-active:[&>svg]:text-primary"
                      >
                        <Icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="mt-auto">
            <SidebarGroupContent>
              <SidebarMenu aria-label="Resources" className="gap-0.5">
                {secondaryItems.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        render={<Link href={item.href} />}
                        isActive={isActive}
                        aria-current={isActive ? "page" : undefined}
                        tooltip={item.title}
                        size="sm"
                        className="data-active:[&>svg]:text-primary"
                      >
                        <Icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* User Footer */}
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <SidebarMenuButton
                      size="lg"
                      tooltip={displayName}
                      className="data-[popup-open]:bg-sidebar-accent data-[popup-open]:text-sidebar-accent-foreground"
                    />
                  }
                >
                  <Avatar className="size-8 rounded-lg">
                    <AvatarImage
                      src={currentUser?.image ?? undefined}
                      alt={displayName}
                      referrerPolicy="no-referrer"
                      className="rounded-lg"
                    />
                    <AvatarFallback className="rounded-lg">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{displayName}</span>
                    {displayEmail ? (
                      <span className="truncate text-xs text-muted-foreground">
                        {displayEmail}
                      </span>
                    ) : null}
                  </div>
                  <ChevronsUpDownIcon className="ml-auto" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="right"
                  align="end"
                  sideOffset={8}
                  className="w-56"
                >
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
                      render={<Link href="/settings" />}
                      className="cursor-pointer"
                    >
                      <UserIcon />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      render={<Link href="/settings" />}
                      className="cursor-pointer"
                    >
                      <SettingsIcon />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      render={<Link href="/billing" />}
                      className="cursor-pointer"
                    >
                      <CreditCardIcon />
                      <span>Billing</span>
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
                      <LogOutIcon />
                      <span>{signingOut ? "Signing out..." : "Sign out"}</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </>
  );
}
