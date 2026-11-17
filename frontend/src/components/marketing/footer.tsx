import * as React from "react";
import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="w-full bg-background py-10 text-xs text-muted-foreground border-t border-border">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <div className="size-5 rounded bg-primary text-primary-foreground flex items-center justify-center font-mono text-[10px] font-bold">
                RP
              </div>
              <span className="font-heading text-sm">ReviewPilot</span>
            </div>
            <p className="text-[11px] text-muted-foreground/80">
              Automated code security analysis, pull request gating & AI remediation.
            </p>
          </div>

          {/* Navigation & Legal Links */}
          <nav
            className="flex flex-wrap items-center gap-x-6 gap-y-2.5 text-xs"
            aria-label="Footer navigation"
          >
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
              href="/terms"
              className="hover:text-foreground transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
            >
              Terms of Service
            </Link>
            <Link
              href="/privacy"
              className="hover:text-foreground transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
            >
              Privacy Policy
            </Link>
            <Link
              href="/refund-policy"
              className="hover:text-foreground transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
            >
              Refund Policy
            </Link>
            <Link
              href="/delivery-policy"
              className="hover:text-foreground transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
            >
              Delivery Policy
            </Link>
            <Link
              href="/contact"
              className="hover:text-foreground transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring rounded font-medium text-foreground"
            >
              Contact Us
            </Link>
            <Link
              href="/security"
              className="hover:text-foreground transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
            >
              Security
            </Link>
          </nav>
        </div>

        {/* Merchant & Copyright Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/60 pt-6 text-[11px] text-muted-foreground/80">
          <div>
            &copy; 2026 ReviewPilot Technologies Private Limited. All rights reserved.
          </div>
          <div className="flex items-center gap-3">
            <span>Powered by Razorpay Payment Gateway</span>
            <span>•</span>
            <span>PCI-DSS Level 1 Certified</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
