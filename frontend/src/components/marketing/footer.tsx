import * as React from "react";
import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="w-full bg-background py-8 text-xs text-muted-foreground border-t border-border">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2 text-foreground font-semibold">
          <div className="size-5 rounded bg-primary text-primary-foreground flex items-center justify-center font-mono text-[10px] font-bold">
            RP
          </div>
          <span className="font-heading">ReviewPilot</span>
        </div>

        {/* Anchor & Legal links */}
        <nav className="flex flex-wrap items-center gap-6" aria-label="Footer navigation">
          <Link
            href="/#features"
            className="hover:text-foreground transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
          >
            Features
          </Link>
          <Link
            href="/#pricing"
            className="hover:text-foreground transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
          >
            Pricing
          </Link>
          <Link
            href="/#faq"
            className="hover:text-foreground transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
          >
            FAQ
          </Link>
          <Link
            href="/security"
            className="hover:text-foreground transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
          >
            Security
          </Link>
          <Link
            href="/privacy"
            className="hover:text-foreground transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="hover:text-foreground transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
          >
            Terms
          </Link>
          <Link
            href="/dashboard"
            className="hover:text-foreground transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
          >
            Dashboard
          </Link>
        </nav>

        {/* Copyright */}
        <div className="font-mono text-[11px] text-muted-foreground/80">
          &copy; {new Date().getFullYear()} ReviewPilot. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

