import * as React from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { TopBar } from "@/components/app-shell/top-bar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
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
  );
}

