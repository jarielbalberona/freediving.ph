const KNOWN_IN_APP_BROWSER_PATTERNS: Array<{
  name: string;
  pattern: RegExp;
}> = [
  {
    name: "Facebook or Messenger",
    pattern: /\b(?:FBAN|FBAV|FB_IAB|FB4A)\b/i,
  },
  {
    name: "Instagram",
    pattern: /\bInstagram\b/i,
  },
  {
    name: "TikTok",
    pattern: /\bTikTok\b/i,
  },
  {
    name: "Line",
    pattern: /\bLine\b/i,
  },
  {
    name: "LinkedIn",
    pattern: /\bLinkedInApp\b/i,
  },
  {
    name: "Twitter/X",
    pattern: /\bTwitter\b/i,
  },
  {
    name: "Android in-app browser",
    pattern: /;\s*wv\)/i,
  },
  {
    name: "Android in-app browser",
    pattern:
      /\bVersion\/[\d.]+(?:\s+\S+)*\s+Chrome\/[\d.]+(?:\s+\S+)*\s+Mobile Safari\/[\d.]+/i,
  },
];

export const getInAppBrowserName = (userAgent: string): string | null => {
  const normalizedUserAgent = userAgent.trim();

  if (!normalizedUserAgent) {
    return null;
  }

  const match = KNOWN_IN_APP_BROWSER_PATTERNS.find(({ pattern }) =>
    pattern.test(normalizedUserAgent),
  );

  return match?.name ?? null;
};

export const isLikelyInAppBrowser = (userAgent: string): boolean =>
  getInAppBrowserName(userAgent) !== null;
