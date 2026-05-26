import { Text, View } from "react-native";

import type { ChikaCommentResponse } from "@freediving.ph/types";

import { MobileCard } from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";
import { formatChikaDate, stripMarkdownPreview } from "@/features/chika/lib/chika-format";

type ChikaCommentCardProps = {
  actionsDisabled?: boolean;
  comment: ChikaCommentResponse;
  depth?: number;
  onReact?: (commentId: string, type: "upvote" | "downvote" | null) => void;
  onReply?: (commentId: string) => void;
};

export function ChikaCommentCard({
  actionsDisabled = false,
  comment,
  depth = 0,
  onReact,
  onReply,
}: ChikaCommentCardProps) {
  const dateLabel = formatChikaDate(comment.createdAt);
  const content = stripMarkdownPreview(comment.content);
  const showActions = Boolean(onReact || onReply);

  return (
    <View style={{ marginLeft: Math.min(depth, 2) * 16 }}>
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
        {showActions ? (
          <View className="flex-row flex-wrap gap-2">
            {onReact ? (
              <>
                <MobileButton
                  disabled={actionsDisabled}
                  variant={
                    comment.userReaction === "upvote" ? "primary" : "secondary"
                  }
                  onPress={() =>
                    onReact(
                      comment.id,
                      comment.userReaction === "upvote" ? null : "upvote",
                    )
                  }
                >
                  Up · {comment.voteCount}
                </MobileButton>
                <MobileButton
                  disabled={actionsDisabled}
                  variant={
                    comment.userReaction === "downvote" ? "primary" : "secondary"
                  }
                  onPress={() =>
                    onReact(
                      comment.id,
                      comment.userReaction === "downvote" ? null : "downvote",
                    )
                  }
                >
                  Down
                </MobileButton>
              </>
            ) : null}
            {onReply ? (
              <MobileButton
                disabled={actionsDisabled}
                variant="ghost"
                onPress={() => onReply(comment.id)}
              >
                Reply
              </MobileButton>
            ) : null}
          </View>
        ) : null}
      </View>
      </MobileCard>
    </View>
  );
}
