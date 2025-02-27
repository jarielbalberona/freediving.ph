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
];
