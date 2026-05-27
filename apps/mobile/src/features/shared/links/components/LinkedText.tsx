import type { ReactNode } from "react";
import { Text, type TextProps } from "react-native";

import { openFphLink } from "@/features/shared/links/lib/open-fph-link";

type LinkedTextProps = TextProps & {
  text: string;
};

const URL_PATTERN = /https?:\/\/[^\s<>"']+|\/[A-Za-z0-9][^\s<>"']*/g;
const TRAILING_PUNCTUATION = /[),.!?:;]+$/;

const trimTrailingPunctuation = (value: string) => {
  const trailing = value.match(TRAILING_PUNCTUATION)?.[0] ?? "";
  return {
    trailing,
    url: trailing ? value.slice(0, -trailing.length) : value,
  };
};

export function LinkedText({ text, ...props }: LinkedTextProps) {
  const nodes: ReactNode[] = [];
  let cursor = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const rawUrl = match[0];
    const start = match.index ?? 0;
    const previousCharacter = start > 0 ? text[start - 1] : "";

    if (
      rawUrl.startsWith("/") &&
      previousCharacter &&
      !/[\s([{"']/.test(previousCharacter)
    ) {
      continue;
    }

    if (start > cursor) {
      nodes.push(text.slice(cursor, start));
    }

    const { trailing, url } = trimTrailingPunctuation(rawUrl);
    if (url) {
      nodes.push(
        <Text
          accessibilityRole="link"
          className="font-medium text-primary underline"
          key={`${url}-${start}`}
          onPress={() => {
            void openFphLink(url);
          }}
        >
          {url}
        </Text>,
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

  return <Text {...props}>{nodes.length > 0 ? nodes : text}</Text>;
}
