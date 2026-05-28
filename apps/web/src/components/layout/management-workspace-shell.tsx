"use client";

import type { ReactNode } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { NavUser } from "@/components/ui/nav-user";
import { isActiveRoute } from "@/config/nav";
import { ProductAnalyticsProvider } from "@/components/analytics/product-analytics-provider";
import { ModeSwitcher } from "@/components/ui/mode-switcher";
import { NotificationRealtimeProvider } from "@/features/notifications/components/NotificationRealtimeProvider";
import {
  ManagementPageContainer,
  type ManagementPageContainerVariant,
} from "@/components/layout/management-page-container";

export type ManagementWorkspaceNavItem = {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  disabled?: boolean;
};

export function ManagementWorkspaceShell({
  switcher,
  navItems,
  backLabel,
  backHref,
  containerVariant = "wide",
  children,
}: {
  switcher: ReactNode;
  navItems: ManagementWorkspaceNavItem[];
  backHref: string;
  backLabel: string;
  containerVariant?: ManagementPageContainerVariant;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <>
      <ProductAnalyticsProvider />
      <NotificationRealtimeProvider />
      <SidebarProvider>
        <Sidebar collapsible="icon">
          <SidebarHeader className="pt-2">
            <Image
              src="/images/fph-logo-white.png"
              alt="Freediving Philippines"
              className="h-[60px] w-[60px] rounded-md object-cover"
              width={60}
              height={60}
              loading="eager"
            />
            <div className="pb-2 pt-3">{switcher}</div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarMenu>
                {navItems.map((item) => {
                  if (item.disabled) {
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          disabled
                          className="pointer-events-none cursor-default px-3"
                        >
                          {item.icon ? <item.icon /> : null}
                          <span className="text-sm">{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  }

                  const active = item.exact
                    ? pathname === item.href
                    : isActiveRoute(pathname ?? "", item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <Link href={item.href} className="flex w-full items-center gap-2">
                        <SidebarMenuButton isActive={active} className="px-3">
                          {item.icon ? <item.icon /> : null}
                          <span className="text-sm">{item.label}</span>
                        </SidebarMenuButton>
                      </Link>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <Link href={backHref} className="flex w-full items-center gap-2">
                  <SidebarMenuButton className="px-3">{backLabel}</SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>
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
            <ManagementPageContainer variant={containerVariant}>
              {children}
            </ManagementPageContainer>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}
