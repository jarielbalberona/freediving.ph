import {
  APP_BOTTOM_NAV_ITEMS,
  APP_DRAWER_NAV_ITEMS,
  type AppNavId,
} from "@freediving.ph/types";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentType } from "react";
import { createElement } from "react";
import type { ColorValue } from "react-native";

type MobileNavIcon = ComponentType<{
  color?: ColorValue;
  size?: number;
}>;

type IoniconName = keyof typeof Ionicons.glyphMap;

type MobilePlatformNavItem = {
  id: AppNavId;
  platforms?: readonly ("mobile" | "web")[];
};

const supportsMobile = (item: MobilePlatformNavItem) =>
  item.platforms == null || item.platforms.includes("mobile");

export type MobileBottomNavItem = {
  id: AppNavId;
  label: string;
  routeName: "(home)" | "chika" | "search" | "create" | "messages" | "profile";
  icon: IoniconName;
  role?: "search";
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
  search: "search",
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

const bottomIconById: Record<AppNavId, MobileBottomNavItem["icon"]> = {
  home: "home-outline",
  chika: "chatbubbles-outline",
  search: "search-outline",
  create: "create-outline",
  messages: "chatbubble-ellipses-outline",
  profile: "person-circle-outline",
  explore: "compass-outline",
  buddies: "people-outline",
  groups: "people-circle-outline",
  events: "calendar-outline",
  schools: "school-outline",
  "manage-schools": "business-outline",
  "instructor-application": "ribbon-outline",
  learn: "book-outline",
  "founders-note": "information-circle-outline",
};

const drawerRouteById: Record<
  AppNavId,
  MobileDrawerNavItem["routeName"] | null
> = {
  home: null,
  chika: null,
  search: null,
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

const makeDrawerIcon = (name: IoniconName): MobileNavIcon =>
  function DrawerIcon({ color, size }) {
    return createElement(Ionicons, { color, name, size });
  };

const drawerIconById: Record<AppNavId, MobileNavIcon> = {
  home: makeDrawerIcon("home-outline"),
  chika: makeDrawerIcon("chatbubbles-outline"),
  search: makeDrawerIcon("search-outline"),
  create: makeDrawerIcon("create-outline"),
  messages: makeDrawerIcon("chatbubble-ellipses-outline"),
  profile: makeDrawerIcon("person-circle-outline"),
  explore: makeDrawerIcon("compass-outline"),
  buddies: makeDrawerIcon("people-outline"),
  groups: makeDrawerIcon("people-circle-outline"),
  events: makeDrawerIcon("calendar-outline"),
  schools: makeDrawerIcon("school-outline"),
  "manage-schools": makeDrawerIcon("business-outline"),
  "instructor-application": makeDrawerIcon("ribbon-outline"),
  learn: makeDrawerIcon("book-outline"),
  "founders-note": makeDrawerIcon("information-circle-outline"),
};

export const MOBILE_BOTTOM_NAV_ITEMS = APP_BOTTOM_NAV_ITEMS.filter(
  supportsMobile,
).map((item) => {
  const routeName = bottomRouteById[item.id];
  if (routeName == null) {
    throw new Error(`Missing mobile bottom route for ${item.id}`);
  }
  return {
    id: item.id,
    label: item.label,
    routeName,
    role: item.id === "search" ? ("search" as const) : undefined,
    icon: bottomIconById[item.id],
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
