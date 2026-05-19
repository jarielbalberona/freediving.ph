import { normalizeUsername } from "@/lib/routes";

export const reservedSlugs = [
  "admin",
  "api",
  "auth",
  "awareness",
  "buddies",
  "buddy",
  "chika",
  "collaboration",
  "competitive-records",
  "events",
  "explore",
  "favicon.ico",
  "groups",
  "icon",
  "manifest.json",
  "manifest.webmanifest",
  "marketplace",
  "media",
  "messages",
  "moderation",
  "notifications",
  "onboarding",
  "opengraph-image",
  "profile",
  "robots.txt",
  "safety",
  "saved",
  "services",
  "settings",
  "sign-in",
  "sign-up",
  "sitemap-index.xml",
  "sitemap.xml",
  "twitter-image",
  "training-logs",
].sort();

const reservedSlugSet = new Set(reservedSlugs);

export const isReservedProfileSlug = (slug: string): boolean =>
  reservedSlugSet.has(normalizeUsername(slug));
