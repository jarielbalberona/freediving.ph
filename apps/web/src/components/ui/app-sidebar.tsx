"use client";

import {
  getGroupedNavItems,
  getMobileSidebarNavGroups,
  isActiveRoute,
} from "@/config/nav";
import { useCurrentProfileHref } from "@/features/profile/hooks/use-current-profile-href";
import { useAuth } from "@clerk/nextjs";
import { BadgeCheck, Info, Map, Shield, UsersRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
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

const adminLinks = [
  { href: "/admin/buddies", title: "Buddies", icon: UsersRound },
  { href: "/admin/dive-sites", title: "Dive Sites", icon: Map },
  { href: "/admin/groups", title: "Groups", icon: Shield },
  { href: "/admin/instructors", title: "Instructors", icon: BadgeCheck },
];

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
  const messageUnreadQuery = useMessageUnreadCount(Boolean(effectiveSignedIn));
  const messageUnreadCount = messageUnreadQuery.data?.unreadCount ?? 0;
  const founderNoteActive = isActiveRoute(pathname ?? "", "/founder-note");

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
                                  <Link href={sub.href ?? "#"}>
                                    {sub.title}
                                  </Link>
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
          {canViewAdmin
            ? adminLinks.map((item) => {
                const active = isActiveRoute(pathname ?? "", item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-2 w-full"
                    >
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
              })
            : null}
          <SidebarMenuItem>
            <Link
              href="/founder-note"
              className="flex items-center gap-2 w-full"
            >
              <SidebarMenuButton
                className="cursor-pointer!"
                isActive={founderNoteActive}
              >
                <Info />
                <span className="text-sm">Founder's Note</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
