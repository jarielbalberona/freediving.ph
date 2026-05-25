import type { ExploreSiteCard, ExploreSiteDetail } from "@freediving.ph/types";

type SiteWithDepth = Pick<ExploreSiteCard | ExploreSiteDetail, "depthMaxM" | "depthMinM">;

export const titleCase = (value: string) =>
  value
    .replace(/[_-]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

export const formatDepthRange = (site: SiteWithDepth) => {
  const hasMin = typeof site.depthMinM === "number";
  const hasMax = typeof site.depthMaxM === "number";
  if (hasMin && hasMax) return `${site.depthMinM}m - ${site.depthMaxM}m`;
  if (hasMin) return `From ${site.depthMinM}m`;
  if (hasMax) return `Up to ${site.depthMaxM}m`;
  return undefined;
};

export const verificationLabel = (value: ExploreSiteDetail["verificationStatus"]) => {
  switch (value) {
    case "verified":
      return "Verified";
    case "moderator":
      return "Checked by team";
    case "instructor":
      return "Instructor noted";
    case "community":
    default:
      return "Community shared";
  }
};

export const safeSiteSlug = (slug: string | undefined) => {
  const trimmed = slug?.trim();
  if (!trimmed || trimmed.includes("/") || trimmed.includes("?") || trimmed.includes("#")) {
    return undefined;
  }
  return trimmed;
};
