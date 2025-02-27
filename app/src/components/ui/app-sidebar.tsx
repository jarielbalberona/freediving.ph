import * as React from "react";
import Image from "next/image";
import { cookies } from "next/headers";
import { navigation } from "@/config/nav";
import { serverAPICall } from "@/lib/api";
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
import { profile } from "console";

export async function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const cookieStore = await cookies();
  // const profile: any = await serverAPICall("/auth/me", {
  //   headers: { Cookie: cookieStore.toString() },
  // });

  const res = await fetch(`${process.env.API_URL}/auth/me`, {
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieStore.toString()
    },
    credentials: "include", // Include cookies
  });

  const { status, data = null} = await res.json()

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
