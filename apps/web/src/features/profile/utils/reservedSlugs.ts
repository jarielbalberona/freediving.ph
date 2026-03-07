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
  "groups",
  "marketplace",
  "media",
  "messages",
  "moderation",
  "notifications",
  "onboarding",
  "profile",
  "safety",
  "saved",
  "services",
  "settings",
  "sign-in",
  "sign-up",
  "training-logs",
].sort();

const reservedSlugSet = new Set(reservedSlugs);

export const isReservedProfileSlug = (slug: string): boolean =>
  reservedSlugSet.has(normalizeUsername(slug));
