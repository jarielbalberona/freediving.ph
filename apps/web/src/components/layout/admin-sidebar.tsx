"use client";

import { ArrowLeft, BadgeCheck, Flag, Group, LayoutDashboard, Users, Wrench } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/features/auth/session";

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
import { isActiveRoute } from "@/config/nav";

const adminItems = [
  {
    href: "/admin",
    label: "Overview",
    icon: LayoutDashboard,
    requireSuperAdmin: true,
  },
  {
    href: "/admin/moderation",
    label: "Moderation",
    icon: Flag,
    permission: "moderation",
  },
  {
    href: "/admin/buddies",
    label: "Buddies",
    icon: Users,
    requireSuperAdmin: true,
  },
  {
    href: "/admin/dive-sites",
    label: "Dive Sites",
    icon: Wrench,
    requireSuperAdmin: true,
  },
  {
    href: "/admin/groups",
    label: "Groups",
    icon: Group,
    requireSuperAdmin: true,
  },
  {
    href: "/admin/instructors",
    label: "Instructors",
    icon: BadgeCheck,
    requireSuperAdmin: true,
  },
];

const backItem = {
  href: "/",
  label: "Back to app",
  icon: ArrowLeft,
};

export function AdminSidebar() {
  const pathname = usePathname();
  const session = useSession();

  const isLoading = session.status === "loading";
  const isSuperAdmin = session.status === "signed_in" && session.hasRole("super_admin");
  const canModerate =
    session.hasPermission("reports.read") ||
    session.hasPermission("explore.moderate") ||
    session.hasPermission("moderation.write");

  if (isLoading) {
    return (
      <Sidebar collapsible="icon">
        <SidebarHeader className="px-2 pt-2">
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

  const visibleItems = adminItems.filter((item) => {
    if (item.permission) return canModerate;
    if (item.requireSuperAdmin) return isSuperAdmin;
    return true;
  });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-2 pt-2">
        <Image
          src="/images/fph-logo-white.png"
          alt="Freediving Philippines"
          className="h-[60px] w-[60px] rounded-md object-cover"
          width={60}
          height={60}
          loading="eager"
        />
      </SidebarHeader>
      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarMenu>
            {visibleItems.map((item) => {
              const active = isActiveRoute(pathname ?? "", item.href);
              return (
                <SidebarMenuItem key={item.href}>
                  <Link href={item.href} className="flex w-full items-center gap-2">
                    <SidebarMenuButton isActive={active}>
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
      <SidebarFooter className="px-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href={backItem.href} className="flex w-full items-center gap-2">
              <SidebarMenuButton>
                <backItem.icon />
                <span className="text-sm">{backItem.label}</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
