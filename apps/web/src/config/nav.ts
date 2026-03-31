import type { ComponentType } from "react";
import {
  MessagesSquare,
  Compass,
  Waves,
  Users,
  ClipboardList,
  MessageCircleMore,
  CalendarHeart,
  Shapes,
  FishSymbol,
  Briefcase,
  Image,
  Dumbbell,
  ShieldAlert,
  Leaf,
  Store,
  Handshake,
  Gavel,
  Plus,
  MoreHorizontal,
} from "lucide-react";

export type NavGroupId =
  | "core"
  | "community"
  | "diving"
  | "resources"
  | "future"
  | "admin";

export type NavKind = "link" | "action";

export type NavItem = {
  id: string;
  title: string;
  kind: NavKind;
  icon?: ComponentType<{ className?: string }>;
  isProtected: boolean;
  group: NavGroupId;
  isMain?: boolean;
  href?: string;
  actionId?: "create" | "more";
  items?: NavItem[];
  /** When true, show a "Coming soon" badge in the sidebar. */
  comingSoon?: boolean;
};

const GROUP_DISPLAY_TITLES: Record<NavGroupId, string> = {
  core: "",
  community: "Community",
  diving: "Diving and Progress",
  resources: "Resources",
  future: "Future",
  admin: "Admin",
};

export const NAV_ITEMS: NavItem[] = [
  {
    id: "home",
    title: "Home",
    kind: "link",
    href: "/#",
    icon: Waves,
    isProtected: false,
    group: "core",
    isMain: true,
  },
  {
    id: "profile",
    title: "Profile",
    kind: "link",
    href: "/profile",
    icon: FishSymbol,
    isProtected: true,
    group: "core",
    isMain: true,
  },
  {
    id: "messages",
    title: "Messages",
    kind: "link",
    href: "/messages",
    icon: MessageCircleMore,
    isProtected: true,
    group: "core",
    isMain: true,
  },
  {
    id: "explore",
    title: "Explore",
    kind: "link",
    href: "/explore",
    icon: Compass,
    isProtected: false,
    group: "core",
    isMain: true,
  },
  {
    id: "buddies",
    title: "Buddies",
    kind: "link",
    href: "/buddies",
    icon: Users,
    isProtected: false,
    group: "community",
  },
  {
    id: "groups",
    title: "Groups",
    kind: "link",
    href: "/groups",
    icon: Shapes,
    isProtected: false,
    group: "community",
  },
  {
    id: "events",
    title: "Events",
    kind: "link",
    href: "/events",
    icon: CalendarHeart,
    isProtected: false,
    group: "community",
  },
  {
    id: "chika",
    title: "Chika",
    kind: "link",
    href: "/chika",
    icon: MessagesSquare,
    isProtected: false,
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
    isProtected: false,
    group: "resources",
    comingSoon: true,
  },
  {
    id: "moderation",
    title: "Moderation",
    kind: "link",
    href: "/moderation/reports",
    icon: Gavel,
    isProtected: true,
    group: "admin",
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
    title: "Create",
    kind: "action",
    actionId: "create",
    icon: Plus,
    isProtected: false,
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
  "messages",
  "more",
  "profile",
];

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
    (item) => item.kind === "link" && isVisible(item, isSignedIn),
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

export function getMainNavItems(_opts?: { isSignedIn: boolean }): NavItem[] {
  return MAIN_NAV_ORDER.map((id) => NAV_ITEMS.find((i) => i.id === id)).filter(
    (item): item is NavItem => item != null,
  );
}

export function getMoreNavGroups({
  isSignedIn,
}: {
  isSignedIn: boolean;
}): Array<{ group: NavGroupId; title: string; items: NavItem[] }> {
  const linkItems = NAV_ITEMS.filter(
    (item) =>
      item.kind === "link" && !item.isMain && isVisible(item, isSignedIn),
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

/** @deprecated Use getVisibleNavItems + getGroupedNavItems. Kept for backward compatibility. */
export const navigation = NAV_ITEMS.filter((i) => i.kind === "link" && !i.comingSoon).map(
  (item) => ({
    title: item.title,
    url: item.href ?? "#",
    icon: item.icon,
    isActive: false,
    isProtected: item.isProtected,
  }),
);
