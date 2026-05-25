import { Text, View } from "react-native";

import type { ChikaCommentResponse } from "@freediving.ph/types";

import { MobileCard } from "@/components/shell";
import { formatChikaDate, stripMarkdownPreview } from "@/features/chika/lib/chika-format";

type ChikaCommentCardProps = {
  comment: ChikaCommentResponse;
};

export function ChikaCommentCard({ comment }: ChikaCommentCardProps) {
  const dateLabel = formatChikaDate(comment.createdAt);
  const content = stripMarkdownPreview(comment.content);

  return (
    <MobileCard>
      <View className="gap-2">
        <View className="flex-row items-start justify-between gap-3">
          <Text className="min-w-0 flex-1 text-sm font-semibold text-foreground">
            {comment.authorDisplayName || "Community member"}
          </Text>
          {dateLabel ? (
            <Text className="shrink-0 text-xs text-muted-foreground">{dateLabel}</Text>
          ) : null}
        </View>
        <Text className="text-sm leading-6 text-muted-foreground">
          {content || "This reply is not available."}
        </Text>
        {comment.replyCount > 0 ? (
          <Text className="text-xs text-muted-foreground">
            {comment.replyCount} {comment.replyCount === 1 ? "reply" : "replies"}
          </Text>
        ) : null}
      </View>
    </MobileCard>
  );
}
