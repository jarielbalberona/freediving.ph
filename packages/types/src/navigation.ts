export type AppNavArea = "bottom" | "drawer";

export type AppNavAuth = "public" | "member";

export type AppNavId =
  | "home"
  | "chika"
  | "create"
  | "messages"
  | "profile"
  | "explore"
  | "buddies"
  | "groups"
  | "events"
  | "schools"
  | "manage-schools"
  | "instructor-application"
  | "learn"
  | "founders-note";

export type AppNavItemContract = {
  id: AppNavId;
  label: string;
  area: AppNavArea;
  order: number;
  auth: AppNavAuth;
  intent: "primary" | "community" | "learning" | "management";
};

export const APP_NAV_ITEMS = [
  {
    id: "home",
    label: "Home",
    area: "bottom",
    order: 10,
    auth: "public",
    intent: "primary",
  },
  {
    id: "chika",
    label: "Chika",
    area: "bottom",
    order: 20,
    auth: "public",
    intent: "primary",
  },
  {
    id: "create",
    label: "Post",
    area: "bottom",
    order: 30,
    auth: "member",
    intent: "primary",
  },
  {
    id: "messages",
    label: "Messages",
    area: "bottom",
    order: 40,
    auth: "member",
    intent: "primary",
  },
  {
    id: "profile",
    label: "Profile",
    area: "bottom",
    order: 50,
    auth: "member",
    intent: "primary",
  },
  {
    id: "explore",
    label: "Explore",
    area: "drawer",
    order: 10,
    auth: "public",
    intent: "community",
  },
  {
    id: "buddies",
    label: "Buddies",
    area: "drawer",
    order: 20,
    auth: "public",
    intent: "community",
  },
  {
    id: "groups",
    label: "Groups",
    area: "drawer",
    order: 30,
    auth: "public",
    intent: "community",
  },
  {
    id: "events",
    label: "Events",
    area: "drawer",
    order: 40,
    auth: "public",
    intent: "community",
  },
  {
    id: "schools",
    label: "Schools",
    area: "drawer",
    order: 50,
    auth: "public",
    intent: "community",
  },
  {
    id: "manage-schools",
    label: "Manage Schools",
    area: "drawer",
    order: 60,
    auth: "member",
    intent: "management",
  },
  {
    id: "instructor-application",
    label: "Instructor Application",
    area: "drawer",
    order: 70,
    auth: "member",
    intent: "management",
  },
  {
    id: "learn",
    label: "Learn",
    area: "drawer",
    order: 80,
    auth: "public",
    intent: "learning",
  },
  {
    id: "founders-note",
    label: "Founder’s Note",
    area: "drawer",
    order: 90,
    auth: "public",
    intent: "learning",
  },
] as const satisfies readonly AppNavItemContract[];

export const APP_BOTTOM_NAV_ITEMS = APP_NAV_ITEMS.filter(
  (item) => item.area === "bottom",
).sort((a, b) => a.order - b.order);

export const APP_DRAWER_NAV_ITEMS = APP_NAV_ITEMS.filter(
  (item) => item.area === "drawer",
).sort((a, b) => a.order - b.order);

export const APP_BOTTOM_NAV_IDS = APP_BOTTOM_NAV_ITEMS.map((item) => item.id);
export const APP_DRAWER_NAV_IDS = APP_DRAWER_NAV_ITEMS.map((item) => item.id);

export function getAppNavItem(id: AppNavId): AppNavItemContract {
  const item = APP_NAV_ITEMS.find((entry) => entry.id === id);
  if (item == null) {
    throw new Error(`Unknown app nav item: ${id}`);
  }
  return item;
}
