import type { ChikaThreadResponse } from "@freediving.ph/types";

export const safeChikaSlug = (slug: string | undefined) => {
  const trimmed = slug?.trim();
  if (!trimmed || trimmed.includes("/") || trimmed.includes("?") || trimmed.includes("#")) {
    return undefined;
  }
  return trimmed;
};

export const formatChikaDate = (value: string | undefined) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
};

export const chikaAuthorLabel = (thread: ChikaThreadResponse) =>
  thread.authorDisplayName?.trim() || "Community member";

export const stripMarkdownPreview = (value: string | undefined) =>
  (value ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/[#>*_~\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
