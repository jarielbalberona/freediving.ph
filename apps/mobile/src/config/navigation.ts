import {
  APP_BOTTOM_NAV_ITEMS,
  APP_DRAWER_NAV_ITEMS,
  type AppNavId,
} from "@freediving.ph/types";
import {
  BookOpen,
  CalendarDays,
  Compass,
  Edit3,
  GraduationCap,
  Home,
  Info,
  MessageCircle,
  MessageSquareText,
  School,
  UserRound,
  UsersRound,
} from "lucide-react-native";
import type { ComponentType } from "react";
import type { ColorValue } from "react-native";

type MobileNavIcon = ComponentType<{
  color?: ColorValue;
  size?: number;
  strokeWidth?: number;
}>;

export type MobileBottomNavItem = {
  id: AppNavId;
  label: string;
  routeName: "(home)" | "chika" | "create" | "messages" | "profile";
  sf: string | { default: string; selected: string };
  md: string;
};

export type MobileDrawerNavItem = {
  id: AppNavId;
  label: string;
  routeName:
    | "explore"
    | "buddies"
    | "groups"
    | "events"
    | "schools"
    | "manage-schools"
    | "instructor-application"
    | "learn"
    | "founders-note";
  icon: MobileNavIcon;
};

const bottomRouteById: Record<
  AppNavId,
  MobileBottomNavItem["routeName"] | null
> = {
  home: "(home)",
  chika: "chika",
  create: "create",
  messages: "messages",
  profile: "profile",
  explore: null,
  buddies: null,
  groups: null,
  events: null,
  schools: null,
  "manage-schools": null,
  "instructor-application": null,
  learn: null,
  "founders-note": null,
};

const nativeTabIconById: Record<
  AppNavId,
  { sf: MobileBottomNavItem["sf"]; md: string }
> = {
  home: { sf: { default: "house", selected: "house.fill" }, md: "home" },
  chika: {
    sf: {
      default: "bubble.left.and.bubble.right",
      selected: "bubble.left.and.bubble.right.fill",
    },
    md: "forum",
  },
  create: {
    sf: { default: "square.and.pencil", selected: "square.and.pencil" },
    md: "edit_square",
  },
  messages: {
    sf: { default: "message", selected: "message.fill" },
    md: "chat",
  },
  profile: { sf: { default: "person", selected: "person.fill" }, md: "person" },
  explore: { sf: "safari", md: "explore" },
  buddies: { sf: "person.2", md: "group" },
  groups: { sf: "person.3", md: "groups" },
  events: { sf: "calendar", md: "event" },
  schools: { sf: "graduationcap", md: "school" },
  "manage-schools": { sf: "building.2", md: "business" },
  "instructor-application": { sf: "checkmark.seal", md: "verified" },
  learn: { sf: "book", md: "menu-book" },
  "founders-note": { sf: "info.circle", md: "info" },
};

const drawerRouteById: Record<
  AppNavId,
  MobileDrawerNavItem["routeName"] | null
> = {
  home: null,
  chika: null,
  create: null,
  messages: null,
  profile: null,
  explore: "explore",
  buddies: "buddies",
  groups: "groups",
  events: "events",
  schools: "schools",
  "manage-schools": "manage-schools",
  "instructor-application": "instructor-application",
  learn: "learn",
  "founders-note": "founders-note",
};

const drawerIconById: Record<AppNavId, MobileNavIcon> = {
  home: Home,
  chika: MessageCircle,
  create: Edit3,
  messages: MessageSquareText,
  profile: UserRound,
  explore: Compass,
  buddies: UsersRound,
  groups: UsersRound,
  events: CalendarDays,
  schools: School,
  "manage-schools": School,
  "instructor-application": GraduationCap,
  learn: BookOpen,
  "founders-note": Info,
};

export const MOBILE_BOTTOM_NAV_ITEMS = APP_BOTTOM_NAV_ITEMS.map((item) => {
  const routeName = bottomRouteById[item.id];
  if (routeName == null) {
    throw new Error(`Missing mobile bottom route for ${item.id}`);
  }
  return {
    id: item.id,
    label: item.label,
    routeName,
    ...nativeTabIconById[item.id],
  };
});

export const MOBILE_DRAWER_NAV_ITEMS = APP_DRAWER_NAV_ITEMS.map((item) => {
  const routeName = drawerRouteById[item.id];
  if (routeName == null) {
    throw new Error(`Missing mobile drawer route for ${item.id}`);
  }
  return {
    id: item.id,
    label: item.label,
    routeName,
    icon: drawerIconById[item.id],
  };
});
