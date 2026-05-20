import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type LinkedCommentTextProps = {
  text: string;
  className?: string;
};

const URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;
const TRAILING_PUNCTUATION = /[),.!?:;]+$/;

const trimTrailingPunctuation = (value: string) => {
  const trailing = value.match(TRAILING_PUNCTUATION)?.[0] ?? "";
  return {
    url: trailing ? value.slice(0, -trailing.length) : value,
    trailing,
  };
};

export function LinkedCommentText({ text, className }: LinkedCommentTextProps) {
  const nodes: ReactNode[] = [];
  let cursor = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const rawUrl = match[0];
    const start = match.index ?? 0;
    if (start > cursor) {
      nodes.push(text.slice(cursor, start));
    }

    const { url, trailing } = trimTrailingPunctuation(rawUrl);
    if (url) {
      nodes.push(
        <a
          key={`${url}-${start}`}
          href={url}
          className="font-medium text-primary underline underline-offset-4 break-words"
        >
          {url}
        </a>,
      );
    }
    if (trailing) {
      nodes.push(trailing);
    }
    cursor = start + rawUrl.length;
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return (
    <p className={cn("whitespace-pre-wrap break-words", className)}>
      {nodes.length > 0 ? nodes : text}
    </p>
  );
}
