import * as React from "react";
import Link from "next/link";
import { ShieldCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="light flex min-h-screen flex-col bg-background text-sm text-foreground">
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

          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheckIcon className="size-3.5 shrink-0" />
            <span>Protected by encrypted HTTP-only session cookies</span>
          </p>
        </div>
      </main>
    </div>
  );
}
