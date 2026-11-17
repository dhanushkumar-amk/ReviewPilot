"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ActivityIcon,
  AlertTriangleIcon,
  BookOpenIcon,
  CreditCardIcon,
  FolderGit2Icon,
  GitPullRequestIcon,
  LayoutDashboardIcon,
  LifeBuoyIcon,
  SettingsIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const platformCommands = [
  {
    title: "Overview",
    href: "/dashboard",
    shortcut: "G D",
    icon: LayoutDashboardIcon,
  },
  {
    title: "Repositories",
    href: "/repositories",
    shortcut: "G R",
    icon: FolderGit2Icon,
  },
  {
    title: "Scans",
    href: "/scans",
    shortcut: "G S",
    icon: ActivityIcon,
  },
  {
    title: "Findings",
    href: "/findings",
    shortcut: "G F",
    icon: AlertTriangleIcon,
  },
  {
    title: "Pull requests",
    href: "/pull-requests",
    shortcut: "G P",
    icon: GitPullRequestIcon,
  },
  {
    title: "Rules",
    href: "/rules",
    shortcut: "G U",
    icon: ShieldCheckIcon,
  },
];

const accountCommands = [
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

const resourceCommands = [
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

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const runCommand = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Quick navigation"
      description="Jump to any ReviewPilot page or resource."
    >
      <CommandInput placeholder="Search pages, repositories, findings..." />
      <CommandList>
        <CommandEmpty>No matching pages found.</CommandEmpty>
        <CommandGroup heading="Platform">
          {platformCommands.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.href}
                value={`${item.title} ${item.href}`}
                onSelect={() => runCommand(item.href)}
              >
                <Icon />
                <span>{item.title}</span>
                <CommandShortcut>{item.shortcut}</CommandShortcut>
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Organization">
          {accountCommands.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.href}
                value={`${item.title} ${item.href}`}
                onSelect={() => runCommand(item.href)}
              >
                <Icon />
                <span>{item.title}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Resources">
          {resourceCommands.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.href}
                value={`${item.title} ${item.href}`}
                onSelect={() => runCommand(item.href)}
              >
                <Icon />
                <span>{item.title}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
