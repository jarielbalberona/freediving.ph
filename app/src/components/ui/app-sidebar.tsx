import * as React from "react";
import Image from "next/image";
import { cookies } from "next/headers";
import { navigation } from "@/config/nav";
import { NavUser } from "@/components/ui/nav-user";

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

export async function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const cookieStore = await cookies();
  const res = await fetch(`${process.env.API_URL}/auth/me`, {
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieStore.toString()
    },
    credentials: "include", // Include cookies
  });

  const { status, data = null } = await res.json()
  let filteredNav = navigation

  // buggy, must hide protected nav items
  if (status === 401 || status === 403) {
    filteredNav = navigation.filter((nav) => !nav.isProtected)
  }

  console.log("AppSidebar status", status);
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
            {filteredNav.map((item) => (
              <SidebarMenuItem key={item.title} className="">
                <SidebarMenuButton asChild>
                  <a href={item.url} className="p-6">
                    <item.icon />
                    <span className="text-base">{item.title}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser initialData={data} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
