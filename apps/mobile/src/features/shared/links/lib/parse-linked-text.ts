export type LinkedTextPart =
  | { type: "text"; text: string }
  | { type: "link"; text: string; url: string };

const URL_PATTERN = /https?:\/\/[^\s<>"']+|\/[A-Za-z0-9][^\s<>"']*/g;
const TRAILING_PUNCTUATION = /[),.!?:;]+$/;
const RELATIVE_LINK_BOUNDARY = /[\s([{"']/;

const trimTrailingPunctuation = (value: string) => {
  const trailing = value.match(TRAILING_PUNCTUATION)?.[0] ?? "";
  return {
    trailing,
    url: trailing ? value.slice(0, -trailing.length) : value,
  };
};

const canUseRelativeMatch = (input: string, start: number) => {
  if (start === 0) return true;
  return RELATIVE_LINK_BOUNDARY.test(input[start - 1] ?? "");
};

export function parseLinkedText(input: string): LinkedTextPart[] {
  const parts: LinkedTextPart[] = [];
  let cursor = 0;

  for (const match of input.matchAll(URL_PATTERN)) {
    const rawUrl = match[0];
    const start = match.index ?? 0;

    if (rawUrl.startsWith("/") && !canUseRelativeMatch(input, start)) {
      continue;
    }

    if (start > cursor) {
      parts.push({ type: "text", text: input.slice(cursor, start) });
    }

    const { trailing, url } = trimTrailingPunctuation(rawUrl);
    if (url) {
      parts.push({ type: "link", text: url, url });
    }
    if (trailing) {
      parts.push({ type: "text", text: trailing });
    }

    cursor = start + rawUrl.length;
  }

  if (cursor < input.length) {
    parts.push({ type: "text", text: input.slice(cursor) });
  }

  return parts.length > 0 ? parts : [{ type: "text", text: input }];
}

