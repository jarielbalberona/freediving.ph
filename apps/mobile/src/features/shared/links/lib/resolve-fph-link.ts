import { FPH_PUBLIC_LINK_HOSTS } from "@/features/shared/links/constants/fph-link-hosts";

export type FphLinkResolution =
  | {
      type: "native";
      href: string;
      sourceUrl: string;
    }
  | {
      type: "external";
      url: string;
    }
  | {
      type: "unsupported-internal";
      url: string;
      reason: string;
    };

const FPH_BASE_URL = "https://freediving.ph";

const RESERVED_TOP_LEVEL_ROUTES = new Set([
  "about-us",
  "admin",
  "auth",
  "awareness",
  "buddies",
  "buddy",
  "chika",
  "collaboration",
  "coming-soon",
  "competitive-records",
  "events",
  "explore",
  "features",
  "founder-note",
  "freediving",
  "guides",
  "instructor",
  "instructors",
  "manage",
  "marketplace",
  "media",
  "messages",
  "moderation",
  "my",
  "notifications",
  "onboarding",
  "profile",
  "safety",
  "saved",
  "schools",
  "services",
  "sign-in",
  "sign-up",
  "training-logs",
]);

const RESERVED_EXPLORE_ROUTES = new Set(["submissions", "submit", "updates"]);

const isSupportedProtocol = (protocol: string) =>
  protocol === "http:" || protocol === "https:";

const parseUrl = (rawUrl: string) => {
  const trimmed = rawUrl.trim();
  if (!trimmed) return undefined;

  try {
    return new URL(trimmed, FPH_BASE_URL);
  } catch {
    return undefined;
  }
};

const normalizePathParts = (pathname: string) =>
  pathname
    .split("/")
    .filter(Boolean)
    .map((part) => {
      try {
        return decodeURIComponent(part);
      } catch {
        return part;
      }
    });

const safeSegment = (value: string | undefined) => {
  const trimmed = value?.trim();
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

const encodeSegment = (value: string) => encodeURIComponent(value);

const nativeDetailHref = (basePath: string, segment: string) =>
  `${basePath}/${encodeSegment(segment)}`;

const unsupported = (
  url: URL,
  reason: string,
): Extract<FphLinkResolution, { type: "unsupported-internal" }> => ({
  type: "unsupported-internal",
  url: url.toString(),
  reason,
});

export function resolveFphLink(rawUrl: string): FphLinkResolution {
  const parsed = parseUrl(rawUrl);
  if (!parsed) {
    return { type: "external", url: rawUrl };
  }

  if (!isSupportedProtocol(parsed.protocol)) {
    return { type: "external", url: rawUrl.trim() || rawUrl };
  }

  const trimmedRawUrl = rawUrl.trim();
  const isProtocolRelative = trimmedRawUrl.startsWith("//");
  const isRelativeInternal =
    trimmedRawUrl.startsWith("/") && !isProtocolRelative;
  const isInternal =
    isRelativeInternal || FPH_PUBLIC_LINK_HOSTS.has(parsed.hostname.toLowerCase());

  if (!isInternal) {
    return { type: "external", url: parsed.toString() };
  }

  const parts = normalizePathParts(parsed.pathname);
  const sourceUrl = isRelativeInternal
    ? `${parsed.pathname}${parsed.search}${parsed.hash}`
    : parsed.toString();

  if (parts.length === 0) {
    return { type: "native", href: "/(app)/(tabs)/(home)", sourceUrl };
  }

  if (parts[0] === "sign-in" && parts.length === 1) {
    return { type: "native", href: "/sign-in", sourceUrl };
  }

  if (parts[0] === "sign-up" && parts.length === 1) {
    return { type: "native", href: "/sign-up", sourceUrl };
  }

  if (parts[0] === "onboarding" && parts.length === 1) {
    return { type: "native", href: "/onboarding", sourceUrl };
  }

  if (parts[0] === "search" && parts.length === 1) {
    return { type: "native", href: "/(app)/(tabs)/search", sourceUrl };
  }

  if (parts[0] === "moderation") {
    if (parts.length === 1) {
      return {
        type: "native",
        href: "/(app)/(tabs)/(home)/moderation",
        sourceUrl,
      };
    }
    if (parts.length === 3 && parts[1] === "reports") {
      const reportId = safeSegment(parts[2]);
      return reportId
        ? {
            type: "native",
            href: `/(app)/(tabs)/(home)/moderation?reportId=${encodeSegment(reportId)}`,
            sourceUrl,
          }
        : unsupported(parsed, "Invalid moderation report URL.");
    }
  }

  if (parts[0] === "admin" && parts[1] === "moderation") {
    if (parts.length === 2) {
      return {
        type: "native",
        href: "/(app)/(tabs)/(home)/moderation",
        sourceUrl,
      };
    }
    if (parts.length === 4 && parts[2] === "reports") {
      const reportId = safeSegment(parts[3]);
      return reportId
        ? {
            type: "native",
            href: `/(app)/(tabs)/(home)/moderation?reportId=${encodeSegment(reportId)}`,
            sourceUrl,
          }
        : unsupported(parsed, "Invalid moderation report URL.");
    }
  }

  if (parts[0] === "explore") {
    if (parts.length === 1) {
      return {
        type: "native",
        href: "/(app)/(tabs)/(home)/explore",
        sourceUrl,
      };
    }
    if (parts[1] === "sites" && parts.length === 3) {
      const slug = safeSegment(parts[2]);
      return slug
        ? {
            type: "native",
            href: nativeDetailHref("/(app)/(tabs)/(home)/explore", slug),
            sourceUrl,
          }
        : unsupported(parsed, "Invalid dive site slug.");
    }
    if (parts.length === 2) {
      const slug = safeSegment(parts[1]);
      if (slug && RESERVED_EXPLORE_ROUTES.has(slug.toLowerCase())) {
        return unsupported(parsed, "Explore workflow URL is not supported natively yet.");
      }
      return slug
        ? {
            type: "native",
            href: nativeDetailHref("/(app)/(tabs)/(home)/explore", slug),
            sourceUrl,
          }
        : unsupported(parsed, "Invalid dive site slug.");
    }
    return unsupported(parsed, "Explore URL is not supported natively yet.");
  }

  if (parts[0] === "chika") {
    if (parts.length === 1) {
      return { type: "native", href: "/(app)/(tabs)/chika", sourceUrl };
    }
    if (parts[1] === "create" && parts.length === 2) {
      return { type: "native", href: "/(app)/(tabs)/chika/post", sourceUrl };
    }
    if (parts.length === 2) {
      const slug = safeSegment(parts[1]);
      return slug
        ? {
            type: "native",
            href: nativeDetailHref("/(app)/(tabs)/chika", slug),
            sourceUrl,
          }
        : unsupported(parsed, "Invalid Chika slug.");
    }
    return unsupported(parsed, "Chika URL is not supported natively yet.");
  }

  if (parts[0] === "events") {
    if (parts.length === 1) {
      return {
        type: "native",
        href: "/(app)/(tabs)/(home)/events",
        sourceUrl,
      };
    }
    if (parts.length === 2) {
      const slug = safeSegment(parts[1]);
      return slug
        ? {
            type: "native",
            href: nativeDetailHref("/(app)/(tabs)/(home)/events", slug),
            sourceUrl,
          }
        : unsupported(parsed, "Invalid event slug.");
    }
    if (parts.length === 3 && parts[2] === "manage") {
      const slug = safeSegment(parts[1]);
      return slug
        ? {
            type: "native",
            href: `${nativeDetailHref("/(app)/(tabs)/(home)/events", slug)}/manage`,
            sourceUrl,
          }
        : unsupported(parsed, "Invalid event slug.");
    }
    if (parts.length === 4 && parts[2] === "pass") {
      const slug = safeSegment(parts[1]);
      const token = safeSegment(parts[3]);
      return slug && token
        ? {
            type: "native",
            href: `${nativeDetailHref("/(app)/(tabs)/(home)/events", slug)}/pass/${encodeSegment(token)}`,
            sourceUrl,
          }
        : unsupported(parsed, "Invalid event pass URL.");
    }
    return unsupported(parsed, "Event URL is not supported natively yet.");
  }

  if (parts[0] === "management" && parts[1] === "schools") {
    if (parts.length === 2) {
      return {
        type: "native",
        href: "/(app)/(tabs)/(home)/manage-schools",
        sourceUrl,
      };
    }
    if (parts.length >= 3) {
      const slug = safeSegment(parts[2]);
      return slug
        ? {
            type: "native",
            href: `/(app)/(tabs)/(home)/manage-schools?slug=${encodeSegment(slug)}`,
            sourceUrl,
          }
        : unsupported(parsed, "Invalid school management URL.");
    }
  }

  if (parts[0] === "schools") {
    if (parts.length === 1) {
      return {
        type: "native",
        href: "/(app)/(tabs)/(home)/schools",
        sourceUrl,
      };
    }
    if (parts.length === 2) {
      const slug = safeSegment(parts[1]);
      return slug
        ? {
            type: "native",
            href: nativeDetailHref("/(app)/(tabs)/(home)/schools", slug),
            sourceUrl,
          }
        : unsupported(parsed, "Invalid school slug.");
    }
    if (parts.length === 3 && parts[2] === "manage") {
      const slug = safeSegment(parts[1]);
      return slug
        ? {
            type: "native",
            href: `/(app)/(tabs)/(home)/manage-schools?slug=${encodeSegment(slug)}`,
            sourceUrl,
          }
        : unsupported(parsed, "Invalid school management URL.");
    }
    if (parts.length === 4 && parts[2] === "courses") {
      const slug = safeSegment(parts[1]);
      const courseSlug = safeSegment(parts[3]);
      return slug && courseSlug
        ? {
            type: "native",
            href: `${nativeDetailHref("/(app)/(tabs)/(home)/schools", slug)}/courses/${encodeSegment(courseSlug)}`,
            sourceUrl,
          }
        : unsupported(parsed, "Invalid school course URL.");
    }
    if (parts.length === 5 && parts[2] === "courses" && parts[4] === "book") {
      const slug = safeSegment(parts[1]);
      const courseSlug = safeSegment(parts[3]);
      return slug && courseSlug
        ? {
            type: "native",
            href: `${nativeDetailHref("/(app)/(tabs)/(home)/schools", slug)}/courses/${encodeSegment(courseSlug)}`,
            sourceUrl,
          }
        : unsupported(parsed, "Invalid school course booking URL.");
    }
    return unsupported(parsed, "School URL is not supported natively yet.");
  }

  if (
    parts[0] === "my" &&
    parts.length === 2 &&
    parts[1] === "bookings"
  ) {
    return {
      type: "native",
      href: "/(app)/(tabs)/(home)/schools/bookings",
      sourceUrl,
    };
  }

  if (parts[0] === "instructor") {
    if (
      parts.length === 2 &&
      (parts[1] === "apply" ||
        parts[1] === "profile" ||
        parts[1] === "certifications")
    ) {
      return {
        type: "native",
        href: "/(app)/(tabs)/(home)/instructor-application",
        sourceUrl,
      };
    }
    return unsupported(parsed, "Instructor URL is not supported natively yet.");
  }

  if (parts[0] === "instructors" && parts.length === 2) {
    const username = safeSegment(parts[1]);
    return username
      ? {
          type: "native",
          href: nativeDetailHref("/(app)/(tabs)/(home)/instructors", username),
          sourceUrl,
        }
      : unsupported(parsed, "Invalid instructor username.");
  }

  if (parts[0] === "groups") {
    if (parts.length === 1) {
      return {
        type: "native",
        href: "/(app)/(tabs)/(home)/groups",
        sourceUrl,
      };
    }
    if (parts.length === 2) {
      const slug = safeSegment(parts[1]);
      return slug
        ? {
            type: "native",
            href: nativeDetailHref("/(app)/(tabs)/(home)/groups", slug),
            sourceUrl,
          }
        : unsupported(parsed, "Invalid group slug.");
    }
    return unsupported(parsed, "Group URL is not supported natively yet.");
  }

  if (parts[0] === "profile" && parts.length === 1) {
    return {
      type: "native",
      href: "/(app)/(tabs)/profile",
      sourceUrl,
    };
  }

  if (parts[0] === "profile" && parts.length === 2 && parts[1] === "settings") {
    return {
      type: "native",
      href: "/(app)/(tabs)/profile/settings",
      sourceUrl,
    };
  }

  if (parts[0] === "profile" && parts.length === 4 && parts[2] === "posts") {
    const postId = safeSegment(parts[3]);
    return postId
      ? {
          type: "native",
          href: nativeDetailHref("/(app)/(tabs)/(home)/media", postId),
          sourceUrl,
        }
      : unsupported(parsed, "Invalid media post id.");
  }

  if (parts[0] === "profile" && parts.length === 2) {
    const username = safeSegment(parts[1]);
    return username
      ? {
          type: "native",
          href: nativeDetailHref("/(app)/(tabs)/(home)/profile", username),
          sourceUrl,
        }
      : unsupported(parsed, "Invalid profile username.");
  }

  if (parts[0] === "notifications" && parts.length === 1) {
    return {
      type: "native",
      href: "/(app)/(tabs)/(home)/notifications",
      sourceUrl,
    };
  }

  if (parts[0] === "saved" && parts.length === 1) {
    return {
      type: "native",
      href: "/(app)/(tabs)/(home)/saved",
      sourceUrl,
    };
  }

  if (parts[0] === "guides" && (parts.length === 1 || parts.length === 2)) {
    return {
      type: "native",
      href: "/(app)/(tabs)/(home)/learn",
      sourceUrl,
    };
  }

  if (
    (parts[0] === "founder-note" || parts[0] === "learn") &&
    parts.length === 1
  ) {
    return {
      type: "native",
      href:
        parts[0] === "founder-note"
          ? "/(app)/(tabs)/(home)/founders-note"
          : "/(app)/(tabs)/(home)/learn",
      sourceUrl,
    };
  }

  if (parts[0] === "messages") {
    if (parts.length === 1) {
      return {
        type: "native",
        href: "/(app)/(tabs)/messages",
        sourceUrl,
      };
    }
    if (parts.length === 2) {
      const threadId = safeSegment(parts[1]);
      return threadId
        ? {
            type: "native",
            href: nativeDetailHref("/(app)/(tabs)/messages", threadId),
            sourceUrl,
          }
        : unsupported(parsed, "Invalid message thread id.");
    }
    return unsupported(parsed, "Messages URL is not supported natively yet.");
  }

  if (parts[0] === "buddies" && parts.length === 1) {
    return { type: "native", href: "/(app)/(tabs)/(home)/buddies", sourceUrl };
  }

  if (
    parts.length === 3 &&
    parts[1] === "posts" &&
    safeSegment(parts[0]) &&
    !RESERVED_TOP_LEVEL_ROUTES.has(parts[0].toLowerCase())
  ) {
    const postId = safeSegment(parts[2]);
    return postId
      ? {
          type: "native",
          href: nativeDetailHref("/(app)/(tabs)/(home)/media", postId),
          sourceUrl,
        }
      : unsupported(parsed, "Invalid media post id.");
  }

  if (
    parts.length === 1 &&
    safeSegment(parts[0]) &&
    !RESERVED_TOP_LEVEL_ROUTES.has(parts[0].toLowerCase())
  ) {
    return {
      type: "native",
      href: nativeDetailHref("/(app)/(tabs)/(home)/profile", parts[0]),
      sourceUrl,
    };
  }

  return unsupported(parsed, "No native mobile route is available for this URL.");
}
