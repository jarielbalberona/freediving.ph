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
  FishSymbol,
} from "lucide-react";

export const navigation = [
  {
    title: "Home",
    url: "/#",
    icon: Waves,
    isActive: true,
    isProtected: false,
  },
  {
    title: "Profile",
    url: "/profile",
    icon: FishSymbol,
    isActive: false,
    isProtected: true,
  },
  {
    title: "Messages",
    url: "/messages",
    icon: MessageCircleMore,
    isActive: false,
    isProtected: true,
  },
  {
    title: "Explore",
    url: "/explore",
    icon: Compass,
    isActive: false,
    isProtected: false,
  },
  {
    title: "Buddies",
    url: "/buddies",
    icon: Users,
    isActive: false,
    isProtected: false,
  },
  {
    title: "Groups",
    url: "/groups",
    icon: Shapes,
    isActive: false,
    isProtected: false,
  },
  {
    title: "Chika",
    url: "/chika",
    icon: MessagesSquare,
    isActive: false,
    isProtected: false,
  },
  {
    title: "Events",
    url: "/events",
    icon: CalendarHeart,
    isActive: false,
    isProtected: false,
  },
  {
    title: "Competitive Records",
    url: "/competitive-records",
    icon: ClipboardList,
    isActive: false,
    isProtected: false,
  },
  {
    title: "Notifications",
    url: "/notifications",
    icon: Bell,
    isActive: false,
    isProtected: true,
  },
];
