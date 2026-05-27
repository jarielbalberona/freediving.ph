import { Text, type TextProps } from "react-native";

import { openFphLink } from "@/features/shared/links/lib/open-fph-link";
import { parseLinkedText } from "@/features/shared/links/lib/parse-linked-text";

type LinkedTextProps = TextProps & {
  text: string;
};

export function LinkedText({ text, ...props }: LinkedTextProps) {
  const parts = parseLinkedText(text);

  return (
    <Text {...props}>
      {parts.map((part, index) =>
        part.type === "link" ? (
          <Text
            accessibilityRole="link"
            className="font-medium text-primary underline"
            key={`${part.url}-${index}`}
            onPress={() => {
              void openFphLink(part.url);
            }}
          >
            {part.text}
          </Text>
        ) : (
          part.text
        ),
      )}
    </Text>
  );
}
