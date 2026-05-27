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
    return unsupported(parsed, "Event URL is not supported natively yet.");
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

  if (parts[0] === "buddies" && parts.length === 1) {
    return { type: "native", href: "/(app)/(tabs)/(home)/buddies", sourceUrl };
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
