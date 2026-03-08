const stripLeadingAt = (value: string): string => value.replace(/^@+/, "");

export const normalizeUsername = (username: string): string =>
  stripLeadingAt(username.trim()).toLowerCase();

const ANONYMOUS_USERNAME_PATTERN = /^(anon(?:ymous)?)(?:[-_].*)?$/i;
const PROFILE_USERNAME_PATTERN = /^[^\s/?#]+$/;

export const isAnonymousUsername = (username: string): boolean =>
  ANONYMOUS_USERNAME_PATTERN.test(normalizeUsername(username));

export const canLinkToProfileUsername = (username: string): boolean => {
  const normalized = normalizeUsername(username);
  return normalized.length > 0 &&
    PROFILE_USERNAME_PATTERN.test(normalized) &&
    !isAnonymousUsername(normalized);
};

export const getProfileRoute = (username: string): string =>
  `/${encodeURIComponent(normalizeUsername(username))}`;

export const getProfileCreateRoute = (username: string): string =>
  `${getProfileRoute(username)}/create`;

export const getProfileFallbackRoute = (): string => "/profile";
