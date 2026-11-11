"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MenuIcon } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

// GitHub mark inline SVG
function GithubMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("size-4 shrink-0", className)}
      aria-hidden="true"
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

export function MarketingNav() {
  const [hasScrolled, setHasScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setHasScrolled(window.scrollY > 8);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Features", href: "/#features" },
    { label: "Security", href: "/security" },
    { label: "Pricing", href: "/#pricing" },
    { label: "FAQ", href: "/#faq" },
  ];

  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    setMobileOpen(false);
    if (href.startsWith("/#") && window.location.pathname === "/") {
      const targetId = href.slice(1);
      const el = document.querySelector(targetId);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <>
      {/* Skip link as first focusable element */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-3 focus:py-1.5 focus:bg-background focus:text-foreground focus:border focus:border-border focus:rounded-md focus:shadow-xs text-xs font-medium"
      >
        Skip to main content
      </a>

      <header
        className={cn(
          "sticky top-0 z-40 h-14 w-full bg-card transition-colors duration-150",
          hasScrolled ? "border-b border-border" : "border-b border-transparent"
        )}
      >
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <Link
            href="/"
            className="flex items-center gap-2.5 text-foreground font-semibold text-sm tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
          >
            <div className="size-6 rounded bg-primary text-primary-foreground flex items-center justify-center font-mono text-[11px] font-bold tracking-tight">
              RP
            </div>
            <span className="font-heading font-semibold text-sm">ReviewPilot</span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav
            className="hidden md:flex items-center gap-6"
            aria-label="Marketing navigation"
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Action Buttons */}
          <div className="hidden sm:flex items-center gap-2.5">
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              render={<Link href="/login" />}
              nativeButton={false}
              className="text-xs"
            >
              Sign in
            </Button>
            <Button
              variant="default"
              size="sm"
              render={<Link href="/sign-up" />}
              nativeButton={false}
              className="text-xs font-medium"
            >
              <GithubMark />
              <span>Connect GitHub</span>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <Button
              variant="default"
              size="xs"
              render={<Link href="/sign-up" />}
              nativeButton={false}
              className="sm:hidden text-xs"
            >
              <GithubMark />
              <span>Connect</span>
            </Button>

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Open mobile navigation menu"
                  />
                }
              >
                <MenuIcon />
              </SheetTrigger>
              <SheetContent side="right" className="w-64 p-5 flex flex-col gap-6">
                <SheetHeader className="p-0 border-none text-left">
                  <SheetTitle className="text-sm font-semibold">Menu</SheetTitle>
                </SheetHeader>

                <nav className="flex flex-col gap-3" aria-label="Mobile menu">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={(e) => handleNavClick(e, link.href)}
                      className="text-sm font-medium text-muted-foreground hover:text-foreground py-1"
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>

                <div className="flex flex-col gap-2 mt-auto pt-4 border-t border-border">
                  <div className="flex items-center justify-between pb-1 text-xs text-muted-foreground">
                    <span>Theme</span>
                    <ThemeToggle />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link href="/login" />}
                    nativeButton={false}
                    className="w-full text-xs"
                  >
                    Sign in
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    render={<Link href="/sign-up" />}
                    nativeButton={false}
                    className="w-full text-xs"
                  >
                    <GithubMark />
                    <span>Connect GitHub</span>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    </>
  );
}
