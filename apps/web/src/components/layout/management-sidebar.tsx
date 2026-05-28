"use client";

import {
  ArrowLeft,
  CalendarHeart,
  LayoutDashboard,
  School,
  UserRoundPen,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useSession } from "@/features/auth/session";
import { isActiveRoute } from "@/config/nav";

const managementItems = [
  {
    href: "/management",
    label: "Overview",
    icon: LayoutDashboard,
  },
  {
    href: "/management/groups",
    label: "Groups",
    icon: Users,
  },
  {
    href: "/management/events",
    label: "Events",
    icon: CalendarHeart,
  },
  {
    href: "/management/schools",
    label: "Schools",
    icon: School,
  },
  {
    href: "/management/instructor-profile",
    label: "Instructor Profile",
    icon: UserRoundPen,
  },
];

const backItem = {
  href: "/",
  title: "Back to app",
  icon: ArrowLeft,
};

export function ManagementSidebar() {
  const pathname = usePathname();
  const session = useSession();
  const isSignedIn = session.status === "signed_in";
  const isLoading = session.status === "loading";

  if (isLoading) {
    return (
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
        </SidebarHeader>
      </Sidebar>
    );
  }

  return (
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
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {managementItems.map((item) => {
              const active = isActiveRoute(pathname ?? "", item.href);
              return (
                <SidebarMenuItem key={item.href}>
                  <Link href={item.href} className="flex w-full items-center gap-2">
                    <SidebarMenuButton isActive={active} className="px-3">
                      <item.icon />
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
          {!isSignedIn ? null : (
            <SidebarMenuItem>
              <Link href={backItem.href} className="flex w-full items-center gap-2">
                <SidebarMenuButton className="px-3">
                  <backItem.icon />
                  <span className="text-sm">{backItem.title}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          )}
          {!isSignedIn ? (
            <SidebarMenuItem>
              <span className="px-3 py-1 text-xs text-muted-foreground">
                Sign in to access management workspace.
              </span>
            </SidebarMenuItem>
          ) : null}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
