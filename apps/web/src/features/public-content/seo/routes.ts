import { featurePages } from "@/features/public-content/content/features";
import { publishedGuides } from "@/features/public-content/content/guides";
import { locationRoutes } from "@/features/public-content/content/locations";

export const publicSeoContentRoutes = [
  "/about-us",
  "/features",
  ...featurePages.map((feature) => feature.href),
  "/guides",
  ...publishedGuides.map((guide) => guide.href),
  ...locationRoutes,
] as const;

export const publicAppIndexRoutes = [
  "/",
  "/founder-note",
  "/explore",
  "/buddies",
  "/chika",
  "/events",
  "/groups",
  "/schools",
] as const;

export const stablePublicRoutes = [
  ...publicAppIndexRoutes,
  ...publicSeoContentRoutes,
] as const;

export const privateRoutePrefixes = [
  "/management",
  "/admin",
  "/auth",
  "/manage",
  "/messages",
  "/moderation",
  "/notifications",
  "/onboarding",
  "/profile",
  "/saved",
  "/settings",
  "/explore/submissions",
] as const;
