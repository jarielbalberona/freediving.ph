import type { Href } from "expo-router";

import type { BuddyFinderIntent } from "@freediving.ph/types";

export const safeBuddyUsername = (username: string | undefined) => {
  const trimmed = username?.trim().replace(/^@/, "");
  if (
    !trimmed ||
    trimmed.includes("/") ||
    trimmed.includes("?") ||
    trimmed.includes("#")
  ) {
    return undefined;
  }
  return trimmed;
};

export const safeDiveSiteSlug = (slug: string | undefined) => {
  const trimmed = slug?.trim();
  if (
    !trimmed ||
    trimmed.includes("/") ||
    trimmed.includes("?") ||
    trimmed.includes("#")
  ) {
    return undefined;
  }
  return trimmed;
};

export const intentTypeLabel = (type: BuddyFinderIntent["intentType"]) => {
  const labels: Record<BuddyFinderIntent["intentType"], string> = {
    depth: "Depth",
    fun_dive: "Fun dive",
    line_training: "Line training",
    pool: "Pool",
    training: "Training",
  };
  return labels[type] ?? type;
};

export const timeWindowLabel = (intent: BuddyFinderIntent) => {
  if (intent.timeWindow === "today") return "Today";
  if (intent.timeWindow === "weekend") return "This weekend";
  if (intent.dateStart && intent.dateEnd) {
    return `${formatDate(intent.dateStart)} to ${formatDate(intent.dateEnd)}`;
  }
  if (intent.dateStart) return formatDate(intent.dateStart);
  return "Flexible dates";
};

export const formatDate = (value: string | undefined) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
  }).format(date);
};

export const formatRecency = (value: string | undefined) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export const certLevelLabel = (value: string | undefined) =>
  value?.trim().replace(/[_-]/g, " ") || "";

export const buddyStatsLabel = (intent: BuddyFinderIntent) => {
  const parts = [
    `${intent.buddyCount} buddies`,
    `${intent.reportCount} reports`,
  ];
  if (intent.mutualBuddiesCount > 0) {
    parts.push(`${intent.mutualBuddiesCount} mutual`);
  }
  return parts.join(" · ");
};

export const buddyProfileHref = (intent: BuddyFinderIntent): Href | undefined => {
  const username = safeBuddyUsername(intent.username);
  return username
    ? { pathname: "/(app)/profile/[username]", params: { username } }
    : undefined;
};
