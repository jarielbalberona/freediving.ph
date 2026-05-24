const nestedAllowedRoots = new Set([
  "features",
  "guides",
  "blog",
  "freediving",
]);
const exactAllowedPaths = new Set(["/about-us"]);

const normalizePathname = (pathname: string): string => {
  const [pathOnly] = pathname.split(/[?#]/);
  if (!pathOnly || pathOnly === "/") return "/";
  const withLeadingSlash = pathOnly.startsWith("/") ? pathOnly : `/${pathOnly}`;
  return withLeadingSlash.replace(/\/+$/, "") || "/";
};

export function isAdsenseAllowedPath(pathname: string): boolean {
  const normalized = normalizePathname(pathname);
  if (exactAllowedPaths.has(normalized)) return true;

  const segments = normalized.split("/").filter(Boolean);
  if (segments.length === 0) return false;

  return nestedAllowedRoots.has(segments[0]);
}
