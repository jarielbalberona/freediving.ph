const stripLeadingAt = (value: string): string => value.replace(/^@+/, "");

export const normalizeUsername = (username: string): string =>
  stripLeadingAt(username.trim()).toLowerCase();

export const getProfileRoute = (username: string): string =>
  `/${encodeURIComponent(normalizeUsername(username))}`;

export const getProfileFallbackRoute = (): string => "/profile";
