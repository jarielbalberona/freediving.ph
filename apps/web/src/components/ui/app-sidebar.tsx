"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  getGroupedNavItems,
  isActiveRoute,
} from "@/config/nav";
import { useCurrentProfileHref } from "@/features/profile/hooks/use-current-profile-href";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { isMobile } = useSidebar();
  const { isLoaded, isSignedIn } = useAuth();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const isAuthReady = mounted && isLoaded;
  const effectiveSignedIn = isAuthReady && isSignedIn;
  const grouped = getGroupedNavItems({
    isSignedIn: effectiveSignedIn ?? false,
  });
  const groupedFiltered = isMobile
    ? grouped.filter((g) => g.group !== "core")
    : grouped;
  const profileHref = useCurrentProfileHref();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <Image
          src="/images/fph-logo-white.png"
          alt="Image"
          className="object-cover rounded-md"
          width={60}
          height={60}
        />
      </SidebarHeader>
      <SidebarContent>
        {groupedFiltered.map(({ group, title, items }) => (
          <SidebarGroup key={group}>
            {title && (
              <SidebarGroupLabel>{title}</SidebarGroupLabel>
            )}
            <SidebarMenu>
              {items.map((item) => {
                const href = item.id === "profile" ? profileHref : item.href ?? "#";
                const active =
                  item.kind === "link" &&
                  isActiveRoute(pathname ?? "", href);
                if (item.items?.length) {
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        render={
                          <Link
                            href={item.kind === "link" ? href : "#"}
                            className="font-medium"
                          >
                            {item.icon != null && <item.icon />}
                            <span className="text-sm">{item.title}</span>
                          </Link>
                        }
                      />
                      <SidebarMenuSub className="ml-0 border-l-0 px-1.5">
                        {item.items.map((sub) => {
                          const subActive =
                            sub.kind === "link" &&
                            sub.href != null &&
                            isActiveRoute(pathname ?? "", sub.href);
                          return (
                            <SidebarMenuSubItem key={sub.id}>
                              <SidebarMenuSubButton
                                isActive={subActive}
                                render={
                                  <Link href={sub.href ?? "#"}>{sub.title}</Link>
                                }
                              />
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </SidebarMenuItem>
                  );
                }
                return (
                  <SidebarMenuItem key={item.id}>
                    <Link
                      href={item.kind === "link" ? href : "#"}
                      className="flex items-center gap-2 w-full"
                    >
                      <SidebarMenuButton
                        className="cursor-pointer!"
                        isActive={active}
                      >
                        {item.icon != null && <item.icon />}
                        <span className="text-sm">{item.title}</span>
                      </SidebarMenuButton>
                                          {item.comingSoon && (
                      <SidebarMenuBadge className="bg-muted text-muted-foreground font-normal px-2">
                        Coming soon
                      </SidebarMenuBadge>
                    )}
                    </Link>

                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
