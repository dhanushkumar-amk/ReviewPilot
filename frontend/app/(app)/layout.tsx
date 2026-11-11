import * as React from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { TopBar } from "@/components/app-shell/top-bar";
import {
  AuthUserProvider,
  type AuthenticatedUser,
} from "@/components/auth/auth-user-provider";
import { env } from "@/src/lib/env";

async function ProtectedAppShell({ children }: { children: React.ReactNode }) {
  const requestHeaders = await headers();
  const cookieHeader = requestHeaders.get("cookie") ?? "";
  if (!cookieHeader) {
    redirect("/login");
  }

  const apiBase = env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "");
  let response: Response;
  try {
    response = await fetch(`${apiBase}/api/me`, {
      method: "GET",
      headers: {
        cookie: cookieHeader,
        accept: "application/json",
      },
      cache: "no-store",
    });
  } catch {
    redirect("/login?reauth=1");
  }

  if (!response.ok) {
    redirect("/login?reauth=1");
  }

  const payload = (await response.json()) as { user?: AuthenticatedUser };
  if (!payload.user) {
    redirect("/login?reauth=1");
  }

  return (
    <AuthUserProvider user={payload.user}>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "15rem", // 240px
          } as React.CSSProperties
        }
        className="min-h-screen bg-background"
      >
        <AppSidebar />
        <SidebarInset className="flex flex-1 flex-col min-w-0 bg-background">
          <TopBar />
          <div className="flex-1 p-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthUserProvider>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ProtectedAppShell>{children}</ProtectedAppShell>
    </React.Suspense>
  );
}
