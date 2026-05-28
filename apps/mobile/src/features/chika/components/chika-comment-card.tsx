import { Text, View } from "react-native";

import type { ChikaCommentResponse } from "@freediving.ph/types";

import { AvatarIdentityRow, SocialActionRow } from "@/components/social";
import { formatChikaDate, stripMarkdownPreview } from "@/features/chika/lib/chika-format";
import { LinkedText } from "@/features/shared/links/components/LinkedText";

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
  const clampedDepth = Math.min(depth, 4);

  return (
    <View className="border-b border-border/60">
      <View
        className="px-4 py-3"
        style={{
          marginLeft: clampedDepth * 14,
        }}
      >
        <View className="flex-row gap-2">
          {clampedDepth > 0 ? (
            <View className="w-3 border-l-2 border-border/40" />
          ) : null}
          <View className="flex-1">
            <AvatarIdentityRow
              meta={[dateLabel]}
              name={comment.authorDisplayName || "Community member"}
            />
            <LinkedText
              className="mt-3 text-sm leading-6 text-muted-foreground"
              text={content || "This reply is not available."}
            />
            {comment.replyCount > 0 ? (
              <Text className="mt-2 text-xs text-muted-foreground">
                {comment.replyCount} {comment.replyCount === 1 ? "reply" : "replies"}
              </Text>
            ) : null}
            {showActions ? (
              <View className="mt-2">
                <SocialActionRow
                  actions={[
                    ...(onReact
                      ? [
                          {
                            accessibilityLabel: "Upvote reply",
                            active: comment.userReaction === "upvote",
                            disabled: actionsDisabled,
                            icon: "arrow-up-circle-outline" as const,
                            label: `Up · ${comment.voteCount}`,
                            onPress: () =>
                              onReact(
                                comment.id,
                                comment.userReaction === "upvote" ? null : "upvote",
                              ),
                          },
                          {
                            accessibilityLabel: "Downvote reply",
                            active: comment.userReaction === "downvote",
                            disabled: actionsDisabled,
                            icon: "arrow-down-circle-outline" as const,
                            label: "Down",
                            onPress: () =>
                              onReact(
                                comment.id,
                                comment.userReaction === "downvote" ? null : "downvote",
                              ),
                          },
                        ]
                      : []),
                    ...(onReply
                      ? [
                          {
                            accessibilityLabel: "Reply to comment",
                            disabled: actionsDisabled,
                            icon: "chatbubble-outline" as const,
                            label: "Reply",
                            onPress: () => onReply(comment.id),
                          },
                        ]
                      : []),
                  ]}
                />
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}
