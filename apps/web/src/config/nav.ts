import type { ComponentType } from "react";
import {
  APP_BOTTOM_NAV_IDS,
  APP_DRAWER_NAV_IDS,
  APP_DRAWER_NAV_ITEMS,
  getAppNavItem,
  type AppNavId,
} from "@freediving.ph/types";
import {
  BadgeCheck,
  BookOpen,
  ClipboardList,
  Compass,
  CalendarHeart,
  Dumbbell,
  FishSymbol,
  Gavel,
  Handshake,
  Image,
  Info,
  Leaf,
  MessageCircleMore,
  MessagesSquare,
  MoreHorizontal,
  Plus,
  Briefcase,
  School,
  Shapes,
  ShieldAlert,
  Store,
  Users,
  Waves,
} from "lucide-react";

export type NavGroupId =
  | "core"
  | "community"
  | "diving"
  | "resources"
  | "future"
  | "manage"
  | "admin";

export type NavKind = "link" | "action";

export type NavItem = {
  id: string | AppNavId;
  title: string;
  kind: NavKind;
  icon?: ComponentType<{ className?: string }>;
  isProtected: boolean;
  group: NavGroupId;
  isMain?: boolean;
  href?: string;
  actionId?: "create" | "more";
  items?: NavItem[];
  /** When true, keep the item out of launch navigation. */
  comingSoon?: boolean;
  /** Footer items are persistent sidebar links, not regular grouped app nav. */
  sidebarPlacement?: "main" | "footer";
};

const GROUP_DISPLAY_TITLES: Record<NavGroupId, string> = {
  core: "",
  community: "Community",
  diving: "Diving and Progress",
  resources: "Resources",
  future: "Future",
  manage: "Manage",
  admin: "Admin",
};

const sharedNav = (id: AppNavId) => getAppNavItem(id);

export const NAV_ITEMS: NavItem[] = [
  {
    id: "home",
    title: sharedNav("home").label,
    kind: "link",
    href: "/",
    icon: Waves,
    isProtected: sharedNav("home").auth === "member",
    group: "core",
    isMain: true,
  },
  {
    id: "profile",
    title: sharedNav("profile").label,
    kind: "link",
    href: "/profile",
    icon: FishSymbol,
    isProtected: sharedNav("profile").auth === "member",
    group: "core",
    isMain: true,
  },
  {
    id: "messages",
    title: sharedNav("messages").label,
    kind: "link",
    href: "/messages",
    icon: MessageCircleMore,
    isProtected: sharedNav("messages").auth === "member",
    group: "core",
    isMain: true,
  },
  {
    id: "explore",
    title: sharedNav("explore").label,
    kind: "link",
    href: "/explore",
    icon: Compass,
    isProtected: sharedNav("explore").auth === "member",
    group: "core",
    isMain: true,
  },
  {
    id: "buddies",
    title: sharedNav("buddies").label,
    kind: "link",
    href: "/buddies",
    icon: Users,
    isProtected: sharedNav("buddies").auth === "member",
    group: "community",
  },
  {
    id: "groups",
    title: sharedNav("groups").label,
    kind: "link",
    href: "/groups",
    icon: Shapes,
    isProtected: sharedNav("groups").auth === "member",
    group: "community",
  },
  {
    id: "events",
    title: sharedNav("events").label,
    kind: "link",
    href: "/events",
    icon: CalendarHeart,
    isProtected: sharedNav("events").auth === "member",
    group: "community",
  },
  {
    id: "schools",
    title: sharedNav("schools").label,
    kind: "link",
    href: "/schools",
    icon: School,
    isProtected: sharedNav("schools").auth === "member",
    group: "community",
  },
  {
    id: "my-bookings",
    title: "My Bookings",
    kind: "link",
    href: "/my/bookings",
    icon: ClipboardList,
    isProtected: true,
    group: "diving",
  },
  {
    id: "chika",
    title: sharedNav("chika").label,
    kind: "link",
    href: "/chika",
    icon: MessagesSquare,
    isProtected: sharedNav("chika").auth === "member",
    group: "core",
    isMain: true,
  },
  {
    id: "competitive-records",
    title: "Competitive Records",
    kind: "link",
    href: "/competitive-records",
    icon: ClipboardList,
    isProtected: false,
    group: "diving",
    comingSoon: true,
  },
  {
    id: "training-logs",
    title: "Training Logs",
    kind: "link",
    href: "/training-logs",
    icon: Dumbbell,
    isProtected: true,
    group: "diving",
    comingSoon: true,
  },
  {
    id: "safety",
    title: "Safety",
    kind: "link",
    href: "/safety",
    icon: ShieldAlert,
    isProtected: false,
    group: "resources",
    comingSoon: true,
  },
  {
    id: "awareness",
    title: "Awareness",
    kind: "link",
    href: "/awareness",
    icon: Leaf,
    isProtected: false,
    group: "resources",
    comingSoon: true,
  },
  {
    id: "services",
    title: "Services",
    kind: "link",
    href: "/services",
    icon: Briefcase,
    isProtected: false,
    group: "resources",
    comingSoon: true,
  },
  {
    id: "media",
    title: "Media",
    kind: "link",
    href: "/media",
    icon: Image,
    isProtected: true,
    group: "core",
    comingSoon: true,
  },
  {
    id: "manage-schools",
    title: sharedNav("manage-schools").label,
    kind: "link",
    href: "/manage/schools",
    icon: School,
    isProtected: sharedNav("manage-schools").auth === "member",
    group: "manage",
  },
  {
    id: "instructor-application",
    title: sharedNav("instructor-application").label,
    kind: "link",
    href: "/instructor/apply",
    icon: BadgeCheck,
    isProtected: sharedNav("instructor-application").auth === "member",
    group: "manage",
  },
  {
    id: "learn",
    title: sharedNav("learn").label,
    kind: "link",
    href: "/guides",
    icon: BookOpen,
    isProtected: sharedNav("learn").auth === "member",
    group: "resources",
    sidebarPlacement: "footer",
  },
  {
    id: "founders-note",
    title: sharedNav("founders-note").label,
    kind: "link",
    href: "/founder-note",
    icon: Info,
    isProtected: sharedNav("founders-note").auth === "member",
    group: "resources",
    sidebarPlacement: "footer",
  },
  {
    id: "moderation",
    title: "Moderation",
    kind: "link",
    href: "/moderation/reports",
    icon: Gavel,
    isProtected: true,
    group: "admin",
    comingSoon: true,
  },
  {
    id: "marketplace",
    title: "Marketplace",
    kind: "link",
    href: "/marketplace",
    icon: Store,
    isProtected: false,
    group: "future",
    comingSoon: true,
  },
  {
    id: "collaboration",
    title: "Collaboration",
    kind: "link",
    href: "/collaboration",
    icon: Handshake,
    isProtected: false,
    group: "future",
    comingSoon: true,
  },
  {
    id: "create",
    title: sharedNav("create").label,
    kind: "action",
    actionId: "create",
    icon: Plus,
    isProtected: sharedNav("create").auth === "member",
    group: "core",
    isMain: true,
  },
  {
    id: "more",
    title: "More",
    kind: "action",
    actionId: "more",
    icon: MoreHorizontal,
    isProtected: false,
    group: "core",
    isMain: true,
  },
];

const MAIN_NAV_ORDER: string[] = [
  "home",
  "explore",
  "chika",
  "create",
  "buddies",
  "messages",
  "more",
];

const MOBILE_MAIN_NAV_ORDER: string[] = [...APP_BOTTOM_NAV_IDS];

const MOBILE_SIDEBAR_ORDER: string[] = [...APP_DRAWER_NAV_IDS];

function isVisible(item: NavItem, isSignedIn: boolean): boolean {
  if (item.kind === "action") return true;
  if (item.comingSoon) return false;
  return isSignedIn || !item.isProtected;
}

export function getVisibleNavItems({
  isSignedIn,
}: {
  isSignedIn: boolean;
}): NavItem[] {
  return NAV_ITEMS.filter(
    (item) => item.kind === "link" && isVisible(item, isSignedIn),
  );
}

export function getGroupedNavItems({
  isSignedIn,
}: {
  isSignedIn: boolean;
}): Array<{ group: NavGroupId; title: string; items: NavItem[] }> {
  const linkItems = NAV_ITEMS.filter(
    (item) =>
      item.kind === "link" &&
      item.sidebarPlacement !== "footer" &&
      isVisible(item, isSignedIn),
  );
  const byGroup = new Map<NavGroupId, NavItem[]>();
  for (const item of linkItems) {
    const list = byGroup.get(item.group) ?? [];
    list.push(item);
    byGroup.set(item.group, list);
  }
  const order: NavGroupId[] = [
    "core",
    "community",
    "diving",
    "resources",
    "future",
    "manage",
    "admin",
  ];
  return order
    .filter((g) => byGroup.has(g))
    .map((group) => ({
      group,
      title: GROUP_DISPLAY_TITLES[group],
      items: byGroup.get(group) ?? [],
    }));
}

export function getMainNavItems(opts?: { isSignedIn: boolean }): NavItem[] {
  const isSignedIn = opts?.isSignedIn ?? false;
  return MAIN_NAV_ORDER.map((id) => NAV_ITEMS.find((i) => i.id === id)).filter(
    (item): item is NavItem =>
      item != null &&
      (item.kind === "action" || isSignedIn || !item.isProtected),
  );
}

export function getMobileMainNavItems(_opts?: {
  isSignedIn: boolean;
}): NavItem[] {
  return MOBILE_MAIN_NAV_ORDER.map((id) =>
    NAV_ITEMS.find((i) => i.id === id),
  ).filter((item): item is NavItem => item != null && !item.comingSoon);
}

export function getMobileSidebarNavGroups({
  isSignedIn,
}: {
  isSignedIn: boolean;
}): Array<{ group: NavGroupId; title: string; items: NavItem[] }> {
  const items = MOBILE_SIDEBAR_ORDER.map((id) =>
    NAV_ITEMS.find((item) => item.id === id),
  ).filter(
    (item): item is NavItem =>
      item != null && item.kind === "link" && isVisible(item, isSignedIn),
  );

  const byGroup = new Map<NavGroupId, NavItem[]>();
  for (const item of items) {
    const list = byGroup.get(item.group) ?? [];
    list.push(item);
    byGroup.set(item.group, list);
  }

  const order: NavGroupId[] = ["core", "community", "manage"];
  return order
    .filter((group) => byGroup.has(group))
    .map((group) => ({
      group,
      title: group === "core" ? "" : GROUP_DISPLAY_TITLES[group],
      items: byGroup.get(group) ?? [],
    }));
}

export function getMoreNavGroups({
  isSignedIn,
}: {
  isSignedIn: boolean;
}): Array<{ group: NavGroupId; title: string; items: NavItem[] }> {
  const linkItems = NAV_ITEMS.filter(
    (item) =>
      item.kind === "link" &&
      !item.isMain &&
      item.sidebarPlacement !== "footer" &&
      isVisible(item, isSignedIn),
  );
  const byGroup = new Map<NavGroupId, NavItem[]>();
  for (const item of linkItems) {
    const list = byGroup.get(item.group) ?? [];
    list.push(item);
    byGroup.set(item.group, list);
  }
  const order: NavGroupId[] = [
    "core",
    "community",
    "diving",
    "resources",
    "future",
    "manage",
    "admin",
  ];
  return order
    .filter((g) => byGroup.has(g))
    .map((group) => ({
      group,
      title: GROUP_DISPLAY_TITLES[group],
      items: byGroup.get(group) ?? [],
    }));
}

export function isActiveRoute(pathname: string, href: string): boolean {
  if (href === "/#" || href === "/") return pathname === "/" || pathname === "";
  const base = href.replace(/#.*$/, "").replace(/\/$/, "") || "/";
  return pathname === base || pathname.startsWith(base + "/");
}

export function getSidebarFooterNavItems({
  isSignedIn,
}: {
  isSignedIn: boolean;
}): NavItem[] {
  return APP_DRAWER_NAV_ITEMS.map((contract) =>
    NAV_ITEMS.find((item) => item.id === contract.id),
  ).filter(
    (item): item is NavItem =>
      item != null &&
      item.kind === "link" &&
      item.sidebarPlacement === "footer" &&
      isVisible(item, isSignedIn),
  );
}

/** @deprecated Use getVisibleNavItems + getGroupedNavItems. Kept for backward compatibility. */
export const navigation = NAV_ITEMS.filter(
  (i) => i.kind === "link" && i.sidebarPlacement !== "footer" && !i.comingSoon,
).map((item) => ({
  title: item.title,
  url: item.href ?? "#",
  icon: item.icon,
  isActive: false,
  isProtected: item.isProtected,
}));
