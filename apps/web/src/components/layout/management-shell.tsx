"use client";

import type { ReactNode } from "react";

import { ProductAnalyticsProvider } from "@/components/analytics/product-analytics-provider";
import { NavUser } from "@/components/ui/nav-user";
import { ModeSwitcher } from "@/components/ui/mode-switcher";
import { NotificationRealtimeProvider } from "@/features/notifications/components/NotificationRealtimeProvider";
import { ManagementSidebar } from "@/components/layout/management-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export function ManagementShell({ children }: { children: ReactNode }) {
  return (
    <>
      <ProductAnalyticsProvider />
      <NotificationRealtimeProvider />
      <SidebarProvider>
        <ManagementSidebar />
        <SidebarInset>
          <div className="sticky inset-x-0 top-0 z-10 isolate flex shrink-0 items-center gap-2 bg-background">
            <div className="flex h-14 w-full items-center gap-2 px-4">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1.5" />
              </div>
              <div className="ml-auto flex items-center gap-2">
                <ModeSwitcher />
                <NavUser />
              </div>
            </div>
          </div>
          <div className="min-h-[calc(100vh-3.5rem)] pb-[var(--app-bottom-nav-height)] md:pb-0">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}
