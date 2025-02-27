import * as React from "react"
import Image from "next/image"
import {
  MessagesSquare,
  Bell,
  Compass,
  Waves,
  Users,
  ClipboardList,
  MessageCircleMore,
  CalendarHeart,
  Shapes,
  FishSymbol
} from "lucide-react"

import { NavUser } from "@/components/ui/nav-user"

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
} from "@/components/ui/sidebar"

// This is sample data.
const data = {
  user: {
    name: "Frothy Meow",
    username: "meowmeow",
    alias: "pspsps",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Home",
      url: "/#",
      icon: Waves,
      isActive: true,
    },
    {
      title: "Profile",
      url: "/profile",
      icon: FishSymbol,
      isActive: true,
    },
    {
      title: "Messages",
      url: "/messages",
      icon: MessageCircleMore,
      isActive: true,
    },
    {
      title: "Explore",
      url: "/explore",
      icon: Compass,
    },
    {
      title: "Buddies",
      url: "/buddies",
      icon: Users,
    },
    {
      title: "Groups",
      url: "/groups",
      icon: Shapes,
    },
    {
      title: "Chika",
      url: "/chika",
      icon: MessagesSquare,
    },
    {
      title: "Events",
      url: "/events",
      icon: CalendarHeart,
    },
    {
      title: "Competitive Records",
      url: "/competitive-records",
      icon: ClipboardList,
    },
    {
      title: "Notifications",
      url: "/notifications",
      icon: Bell,
    },
  ]
}


export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
          <Image src="/images/freedivingph-blue-transparent.png" alt="Image" className="object-cover p-4 rounded-md" width={150}  height={100}/>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {data.navMain.map((item) => (
                <SidebarMenuItem key={item.title} className="">
                  <SidebarMenuButton asChild>
                    <a href={item.url} className="p-6">
                      <item.icon />
                      <span  className="text-base">{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
