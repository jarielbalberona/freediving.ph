import * as React from "react";
import Image from "next/image";
import { navigation } from "@/config/nav";
import { NavUser } from "@/components/ui/nav-user";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import Link from "next/link";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
        <SidebarGroup>
          <SidebarMenu>
            <SignedIn>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.title} >
                  <Link
                    href={item.url}
                    className="flex items-center gap-2 w-full "
                  >
                    <SidebarMenuButton className="cursor-pointer!">
                      <item.icon />
                      <span className="text-sm">{item.title}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
            </SignedIn>
            <SignedOut>
              {navigation
                .filter((nav) => !nav.isProtected)
                .map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <Link href={item.url} className="flex items-center gap-2">
                      <SidebarMenuButton className="cursor-pointer!">
                        <item.icon />
                        <span className="text-sm">{item.title}</span>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                ))}
            </SignedOut>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
