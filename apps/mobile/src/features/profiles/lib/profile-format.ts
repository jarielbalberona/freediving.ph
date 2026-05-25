import type { Profile, PublicProfileApiProfile } from "@freediving.ph/types";

export const safeProfileUsername = (username: string | undefined) => {
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

export const safeImageUrl = (url: string | undefined) => {
  const trimmed = url?.trim();
  if (!trimmed) return undefined;
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return undefined;
  }
  return trimmed;
};

export const profileInitials = (name: string | undefined) => {
  const parts = (name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  const initials = parts.map((part) => part.charAt(0).toUpperCase()).join("");
  return initials || "FP";
};

export const profileHandle = (username: string | undefined) =>
  username?.trim() ? `@${username.trim()}` : "";

export const profileLocationLabel = (profile: Profile) =>
  profile.homeArea?.trim() || profile.location?.trim() || "";

export const profileBio = (
  profile: Pick<Profile, "bio"> | Pick<PublicProfileApiProfile, "bio">,
) =>
  profile.bio?.trim() ||
  "This diver has not shared much yet.";

export const profileCountLabel = (value: number | undefined, label: string) =>
  `${value ?? 0} ${label}`;

export const certLevelLabel = (value: string | undefined) =>
  value?.trim().replace(/[_-]/g, " ") || "";
