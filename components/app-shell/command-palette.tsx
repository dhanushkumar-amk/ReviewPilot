"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from "@/components/ui/command";
import {
  LayoutDashboardIcon,
  FolderGit2Icon,
  ScanSearchIcon,
  ShieldAlertIcon,
  GitPullRequestIcon,
  SettingsIcon,
} from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const handleSelect = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Navigation command palette"
      description="Search and navigate between application views"
    >
      <CommandInput placeholder="Search navigation views..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => handleSelect("/dashboard")}>
            <LayoutDashboardIcon data-icon="inline-start" />
            <span>Dashboard</span>
            <CommandShortcut>G D</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("/repositories")}>
            <FolderGit2Icon data-icon="inline-start" />
            <span>Repositories</span>
            <CommandShortcut>G R</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("/scans")}>
            <ScanSearchIcon data-icon="inline-start" />
            <span>Scans</span>
            <CommandShortcut>G S</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("/findings")}>
            <ShieldAlertIcon data-icon="inline-start" />
            <span>Findings</span>
            <CommandShortcut>G F</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("/pull-requests")}>
            <GitPullRequestIcon data-icon="inline-start" />
            <span>Pull requests</span>
            <CommandShortcut>G P</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("/settings")}>
            <SettingsIcon data-icon="inline-start" />
            <span>Settings</span>
            <CommandShortcut>G ,</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

