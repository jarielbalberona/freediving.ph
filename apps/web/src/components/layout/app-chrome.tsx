"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { ProductAnalyticsProvider } from "@/components/analytics/product-analytics-provider";
import { AuthGate } from "@/features/auth/auth-gate";
import { ManagementShell } from "@/components/layout/management-shell";
import { DesktopCreateFab } from "@/components/nav/desktop-create-fab";
import { AdminShell } from "@/components/layout/admin-shell";
import { MobileNavWithDrawers } from "@/components/nav/mobile-nav-with-drawers";
import { NotificationCenter } from "@/components/nav/notification-center";
import { AppLogo } from "@/components/ui/app-logo";
import { AppSidebar } from "@/components/ui/app-sidebar";
import { ModeSwitcher } from "@/components/ui/mode-switcher";
import { NavUser } from "@/components/ui/nav-user";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { NotificationRealtimeProvider } from "@/features/notifications/components/NotificationRealtimeProvider";

const publicContentPrefixes = ["/features", "/guides", "/freediving"];
const publicContentPaths = new Set(["/about-us"]);

const isPublicContentPath = (pathname: string | null): boolean => {
  if (!pathname) return false;
  if (publicContentPaths.has(pathname)) return true;
  return publicContentPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
};

export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isManagementRoute = pathname?.startsWith("/management") ?? false;
  const isManagementWorkspaceRoute =
    (pathname?.startsWith("/management/schools/") ?? false) ||
    (pathname?.startsWith("/management/events/") ?? false) ||
    (pathname?.startsWith("/management/groups/") ?? false);
  const isAdminRoute = pathname?.startsWith("/admin") ?? false;
  const isPublicChromeBypass =
    isManagementRoute || isAdminRoute || isPublicContentPath(pathname);

  if (isPublicChromeBypass) {
    if (isManagementRoute && isManagementWorkspaceRoute) {
      return (
        <ClerkProvider>
          <AuthGate />
          <div>{children}</div>
        </ClerkProvider>
      );
    }

    if (isManagementRoute) {
      return (
        <ClerkProvider>
          <ManagementShell>
            <AuthGate />
            <div>{children}</div>
          </ManagementShell>
        </ClerkProvider>
      );
    }

    if (isAdminRoute) {
      return (
        <ClerkProvider>
          <AdminShell>
            <AuthGate />
            <div>{children}</div>
          </AdminShell>
        </ClerkProvider>
      );
    }

    return <>{children}</>;
  }

  return (
    <ClerkProvider>
      <ProductAnalyticsProvider />
      <NotificationRealtimeProvider />
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <AuthGate />
          <header className="sticky inset-x-0 top-0 z-10 isolate flex shrink-0 items-center gap-2 bg-background">
            <div className="flex h-14 w-full items-center gap-2 px-4">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1.5" />
                <AppLogo />
              </div>
              <div className="ml-auto flex items-center gap-2">
                <ModeSwitcher />
                <NotificationCenter />
                <NavUser />
              </div>
            </div>
          </header>
          <div className="min-h-[calc(100vh-3.5rem)] pb-[var(--app-bottom-nav-height)] md:pb-0">
            {children}
          </div>
        </SidebarInset>
        <MobileNavWithDrawers />
        <DesktopCreateFab />
      </SidebarProvider>
    </ClerkProvider>
  );
}
