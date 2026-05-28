"use client";

import {
  getGroupedNavItems,
  getMobileSidebarNavGroups,
  getSidebarFooterNavItems,
  isActiveRoute,
} from "@/config/nav";
import { useCurrentProfileHref } from "@/features/profile/hooks/use-current-profile-href";
import { useAuth } from "@clerk/nextjs";
import { ChevronRight, Flag, Shield } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { useSession } from "@/features/auth/session";
import { useMessageUnreadCount } from "@/features/messages/hooks/queries";

const formatBadgeCount = (count: number) =>
  count > 99 ? "99+" : String(count);

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { isMobile } = useSidebar();
  const { isLoaded, isSignedIn } = useAuth();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const isAuthReady = mounted && isLoaded;
  const effectiveSignedIn = isAuthReady && isSignedIn;
  const grouped = isMobile
    ? getMobileSidebarNavGroups({
      isSignedIn: effectiveSignedIn ?? false,
    })
    : getGroupedNavItems({
      isSignedIn: effectiveSignedIn ?? false,
    });
  const profileHref = useCurrentProfileHref();
  const session = useSession();
  const canViewAdmin = session.hasRole("super_admin");
  const canViewModeration =
    session.hasPermission("reports.read") ||
    session.hasPermission("explore.moderate") ||
    session.hasPermission("moderation.write");
  const messageUnreadQuery = useMessageUnreadCount(Boolean(effectiveSignedIn));
  const messageUnreadCount = messageUnreadQuery.data?.unreadCount ?? 0;
  const sidebarFooterItems = getSidebarFooterNavItems({
    isSignedIn: effectiveSignedIn ?? false,
  });

  const adminLinks = [
    ...(canViewAdmin
      ? [
        {
          href: "/admin",
          title: "Admin",
          icon: Shield,
        },
      ]
      : [])
  ];

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
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
        {grouped.map(({ group, title, items }) => (
          <SidebarGroup key={group}>
            {title && <SidebarGroupLabel>{title}</SidebarGroupLabel>}
            <SidebarMenu>
              {items.map((item) => {
                const href =
                  item.id === "profile" ? profileHref : (item.href ?? "#");
                const active =
                  item.kind === "link" && isActiveRoute(pathname ?? "", href);
                if (item.items?.length) {
                  const isExpanded =
                    item.items.some(
                      (sub) =>
                        sub.kind === "link" &&
                        sub.href != null &&
                        isActiveRoute(pathname ?? "", sub.href),
                    ) || active;
                  return (
                    <Collapsible
                      key={item.id}
                      defaultOpen={isExpanded}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger
                          render={
                            <SidebarMenuButton
                              className="w-full"
                              isActive={isExpanded}
                            >
                              {item.icon != null && <item.icon />}
                              <span className="text-sm">{item.title}</span>
                              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                            </SidebarMenuButton>
                          }
                        />
                        <CollapsibleContent
                          className="overflow-hidden transition-all duration-200 ease-out data-[state=open]:max-h-80 data-[state=closed]:max-h-0 data-[state=open]:opacity-100 data-[state=closed]:opacity-0 data-[state=closed]:pt-0 data-[state=closed]:pb-0 data-[state=open]:pt-1 data-[state=open]:pb-1.5"
                        >
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
                                      <Link href={sub.href ?? "#"}>
                                        {sub.icon != null ? (
                                          <sub.icon className="size-3.5" />
                                        ) : null}
                                        {sub.title}
                                      </Link>
                                    }
                                  />
                                </SidebarMenuSubItem>
                              );
                            })}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
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
                        {item.id === "messages" && messageUnreadCount > 0 ? (
                          <Badge className="ml-auto h-5 min-w-5 rounded-full px-1.5 text-[10px]">
                            {formatBadgeCount(messageUnreadCount)}
                          </Badge>
                        ) : null}
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {adminLinks.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : isActiveRoute(pathname ?? "", item.href);
            return (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href} className="flex items-center gap-2 w-full">
                  <SidebarMenuButton
                    className="cursor-pointer!"
                    isActive={active}
                  >
                    <item.icon />
                    <span className="text-sm">{item.title}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            );
          })}
          {sidebarFooterItems.map((item) => {
            const href = item.href ?? "#";
            const active =
              item.kind === "link" && isActiveRoute(pathname ?? "", href);
            return (
              <SidebarMenuItem key={item.id}>
                <Link href={href} className="flex items-center gap-2 w-full">
                  <SidebarMenuButton
                    className="cursor-pointer!"
                    isActive={active}
                  >
                    {item.icon != null && <item.icon />}
                    <span className="text-sm">{item.title}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
