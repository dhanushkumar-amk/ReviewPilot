import * as React from "react";
import Link from "next/link";
import { ShieldCheckIcon } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-sm text-foreground">
      <header className="h-14 w-full border-b border-border bg-card">
        <div className="mx-auto flex h-full w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-md text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <div className="flex size-7 items-center justify-center rounded-md bg-primary font-mono text-xs font-bold tracking-tight text-primary-foreground">
              RP
            </div>
            <span className="font-heading text-base font-semibold tracking-tight">
              ReviewPilot
            </span>
          </Link>

          <nav aria-label="Authentication navigation" className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/status" />}
              nativeButton={false}
            >
              <span>Status</span>
            </Button>
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              render={<Link href="/" />}
              nativeButton={false}
            >
              <span>Back to site</span>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6">
        <div className="flex w-full max-w-[440px] flex-col gap-5">
          <React.Suspense fallback={null}>{children}</React.Suspense>

          <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
            <p className="flex items-center justify-center gap-1.5">
              <ShieldCheckIcon className="size-3.5 shrink-0" />
              <span>Protected by encrypted HTTP-only session cookies</span>
            </p>
            <nav aria-label="Legal navigation" className="flex items-center gap-3">
              <Link href="/terms" className="hover:text-foreground transition-colors underline-offset-4 hover:underline">
                Terms
              </Link>
              <span aria-hidden="true">·</span>
              <Link href="/privacy" className="hover:text-foreground transition-colors underline-offset-4 hover:underline">
                Privacy
              </Link>
              <span aria-hidden="true">·</span>
              <Link href="/security" className="hover:text-foreground transition-colors underline-offset-4 hover:underline">
                Security
              </Link>
            </nav>
          </div>
        </div>
      </main>
    </div>
  );
}
