import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import type { ChikaThreadResponse } from "@freediving.ph/types";

import { SocialActionRow, SocialListRow, StatusPill } from "@/components/social";
import {
  chikaAuthorLabel,
  formatChikaDate,
  safeChikaSlug,
  stripMarkdownPreview,
} from "@/features/chika/lib/chika-format";

type ChikaThreadCardProps = {
  thread: ChikaThreadResponse;
};

function ChikaThreadCardContent({ thread }: ChikaThreadCardProps) {
  const preview = stripMarkdownPreview(thread.content);
  const dateLabel = formatChikaDate(thread.createdAt);
  const authorLabel = chikaAuthorLabel(thread);

  return (
    <SocialListRow
      body={preview}
      meta={[
        thread.categoryName || "Chika",
        thread.categoryPseudonymous ? "Anonymous" : authorLabel,
        dateLabel,
      ]}
      name={authorLabel}
      status={thread.isHidden ? <StatusPill>Hidden</StatusPill> : null}
      title={thread.title || "Untitled Chika"}
    >
      <SocialActionRow
        actions={[
          {
            accessibilityLabel: "Chika replies",
            icon: "chatbubble-outline",
            label: `${thread.commentCount} ${
              thread.commentCount === 1 ? "reply" : "replies"
            }`,
          },
        ]}
      />
    </SocialListRow>
  );
}

export function ChikaThreadCard({ thread }: ChikaThreadCardProps) {
  const slug = safeChikaSlug(thread.slug);

  if (!slug) {
    return <ChikaThreadCardContent thread={thread} />;
  }

  return (
    <Link
      href={{ pathname: "/(app)/(tabs)/chika/[slug]", params: { slug } }}
      asChild
    >
      <Pressable accessibilityRole="link">
        <ChikaThreadCardContent thread={thread} />
      </Pressable>
    </Link>
  );
}
