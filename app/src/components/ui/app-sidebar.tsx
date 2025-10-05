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

export function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <Image
          src="/images/freedivingph-blue-transparent.png"
          alt="Image"
          className="object-cover p-4 rounded-md"
          width={150}
          height={100}
        />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SignedIn>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.title} className="">
                  <SidebarMenuButton asChild>
                    <a href={item.url} className="p-6">
                      <item.icon />
                      <span className="text-base">{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SignedIn>
            <SignedOut>
              {navigation.filter((nav) => !nav.isProtected).map((item) => (
                <SidebarMenuItem key={item.title} className="">
                  <SidebarMenuButton asChild>
                    <a href={item.url} className="p-6">
                      <item.icon />
                      <span className="text-base">{item.title}</span>
                    </a>
                  </SidebarMenuButton>
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
