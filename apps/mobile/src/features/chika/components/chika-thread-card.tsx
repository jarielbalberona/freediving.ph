import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import type { ChikaThreadResponse } from "@freediving.ph/types";

import { MobileCard } from "@/components/shell";
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
    <MobileCard>
      <View className="gap-3">
        <View className="flex-row items-start justify-between gap-3">
          <View className="min-w-0 flex-1 gap-1">
            <Text className="text-xs font-semibold uppercase text-primary">
              {thread.categoryName || "Chika"}
            </Text>
            <Text className="text-base font-semibold leading-6 text-foreground">
              {thread.title || "Untitled Chika"}
            </Text>
          </View>
          {dateLabel ? (
            <Text className="shrink-0 text-xs text-muted-foreground">{dateLabel}</Text>
          ) : null}
        </View>

        {preview ? (
          <Text className="text-sm leading-6 text-muted-foreground" numberOfLines={3}>
            {preview}
          </Text>
        ) : null}

        <View className="flex-row flex-wrap gap-2">
          <Text className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            {authorLabel}
          </Text>
          {thread.categoryPseudonymous ? (
            <Text className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              Anonymous
            </Text>
          ) : null}
          <Text className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            {thread.commentCount} {thread.commentCount === 1 ? "reply" : "replies"}
          </Text>
          {thread.isHidden ? (
            <Text className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              Hidden
            </Text>
          ) : null}
        </View>
      </View>
    </MobileCard>
  );
}

export function ChikaThreadCard({ thread }: ChikaThreadCardProps) {
  const slug = safeChikaSlug(thread.slug);

  if (!slug) {
    return <ChikaThreadCardContent thread={thread} />;
  }

  return (
    <Link href={{ pathname: "/(app)/chika/[slug]", params: { slug } }} asChild>
      <Pressable accessibilityRole="link">
        <ChikaThreadCardContent thread={thread} />
      </Pressable>
    </Link>
  );
}
