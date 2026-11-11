import * as React from "react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="light flex min-h-screen flex-col items-center justify-center bg-background p-6 text-sm text-foreground">
      <div className="flex w-full max-w-[400px] flex-col gap-6">
        <div className="flex justify-center">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded font-semibold text-sm tracking-tight text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <div className="flex size-7 items-center justify-center rounded bg-foreground font-mono text-xs font-bold tracking-tight text-background">
              RP
            </div>
            <span className="font-heading text-base font-semibold">ReviewPilot</span>
          </Link>
        </div>

        <React.Suspense fallback={null}>{children}</React.Suspense>
      </div>
    </main>
  );
}

