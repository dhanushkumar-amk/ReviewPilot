"use client";

import * as React from "react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { SunIcon, MoonIcon, MonitorIcon, CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle({
  showLabel = false,
  className,
}: {
  showLabel?: boolean;
  className?: string;
}) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size={showLabel ? "sm" : "icon"}
        aria-label="Toggle theme"
        className={cn("size-8 text-muted-foreground", className)}
      >
        <SunIcon className="size-4" />
        {showLabel && <span>Theme</span>}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              className={cn(
                "inline-flex items-center justify-center rounded-md text-xs font-medium transition-colors hover:bg-muted text-muted-foreground hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 size-8 cursor-pointer",
                className
              )}
              aria-label={`Current theme: ${theme}. Switch theme`}
            >
              {resolvedTheme === "dark" ? (
                <MoonIcon className="size-4 shrink-0 text-foreground" />
              ) : (
                <SunIcon className="size-4 shrink-0 text-foreground" />
              )}
            </DropdownMenuTrigger>
          }
        >
          <span className="sr-only">Toggle theme</span>
        </TooltipTrigger>
        <TooltipContent>Theme ({resolvedTheme})</TooltipContent>
      </Tooltip>

      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => setTheme("light")}
            className="flex items-center justify-between cursor-pointer text-xs"
          >
            <div className="flex items-center gap-2">
              <SunIcon className="size-3.5" />
              <span>Light</span>
            </div>
            {theme === "light" && <CheckIcon className="size-3.5" />}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setTheme("dark")}
            className="flex items-center justify-between cursor-pointer text-xs"
          >
            <div className="flex items-center gap-2">
              <MoonIcon className="size-3.5" />
              <span>Dark</span>
            </div>
            {theme === "dark" && <CheckIcon className="size-3.5" />}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setTheme("system")}
            className="flex items-center justify-between cursor-pointer text-xs"
          >
            <div className="flex items-center gap-2">
              <MonitorIcon className="size-3.5" />
              <span>System</span>
            </div>
            {theme === "system" && <CheckIcon className="size-3.5" />}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
