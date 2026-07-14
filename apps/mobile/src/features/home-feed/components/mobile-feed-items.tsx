import { Ionicons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { Link, router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import type { ChikaReactionType } from "@freediving.ph/types";

import type { HomeActivityCardModel } from "@/features/home-feed/lib/activity-card-model";
import {
  MobileFeedActionRow,
  MobileFeedOverflowMenu,
  MobileFeedPostHeader,
  MobileMediaGalleryPreview,
  shareFeedItem,
  viewerMediaItemsFromFeedMedia,
} from "@/features/home-feed/components/mobile-feed-primitives";
import { MediaPostCommentsSheet } from "@/features/media/components/media-post-comments-sheet";

type CommonFeedItemProps = {
  actionsDisabled?: boolean;
  item: HomeActivityCardModel;
  onChikaVote?: (reaction: ChikaReactionType | null) => void;
  onMediaLike?: () => void;
  onNotInterested?: () => void;
  videoActive?: boolean;
};

function openHref(href: Href | undefined) {
  if (!href) return;
  router.push(href);
}

function MobileFeedArticle({
  children,
  item,
  onNotInterested,
}: {
  children: React.ReactNode;
  item: HomeActivityCardModel;
  onNotInterested?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <View className="border-b border-border/60 bg-background py-4">
      <MobileFeedPostHeader item={item} onMorePress={() => setMenuOpen(true)} />
      <View className="mt-3 gap-3">{children}</View>
      <MobileFeedOverflowMenu
        item={item}
        onClose={() => setMenuOpen(false)}
        onNotInterested={onNotInterested}
        visible={menuOpen}
      />
    </View>
  );
}

function LinkedTextBlock({
  body,
  href,
  title,
}: {
  body?: string;
  href?: Href;
  title: string;
}) {
  const content = (
    <View className="gap-2 px-4">
      <Text className="text-base font-semibold leading-6 text-foreground">
        {title}
      </Text>
      {body ? (
        <Text
          className="text-sm leading-6 text-muted-foreground"
          numberOfLines={4}
        >
          {body}
        </Text>
      ) : null}
    </View>
  );

  if (!href) return content;

  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityLabel={`Open ${title}`}
        accessibilityRole="link"
        className="active:opacity-80"
      >
        {content}
      </Pressable>
    </Link>
  );
}

function MetadataStrip({ values }: { values: string[] }) {
  if (values.length === 0) return null;
  return (
    <View className="flex-row flex-wrap gap-x-3 gap-y-1 px-4">
      {values.slice(0, 3).map((value) => (
        <Text
          className="text-xs font-medium text-muted-foreground"
          key={value}
          numberOfLines={1}
        >
          {value}
        </Text>
      ))}
    </View>
  );
}

export function MobileMediaFeedItem({
  actionsDisabled,
  item,
  onMediaLike,
  onNotInterested,
  videoActive = false,
}: CommonFeedItemProps) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const imageUrl = item.media?.previewUrl;
  const hasMultipleItems = (item.media?.itemCount ?? 0) > 1;
  const viewerItems = viewerMediaItemsFromFeedMedia(item.media?.items ?? []);

  if (
    (!imageUrl || viewerItems.length === 0) &&
    process.env.NODE_ENV === "development"
  ) {
    console.warn("Media feed item missing preview URL", {
      id: item.id,
      mediaObjectId: item.media?.mediaObjectId,
    });
  }

  return (
    <MobileFeedArticle item={item} onNotInterested={onNotInterested}>
      {item.body ? (
        <Text
          className="px-4 text-sm leading-6 text-foreground"
          numberOfLines={4}
        >
          {item.body}
        </Text>
      ) : null}
      {imageUrl ? (
        <MobileMediaGalleryPreview
          accessibilityLabel={item.title}
          items={viewerItems}
          previewUrl={imageUrl}
          showMultipleBadge={hasMultipleItems}
          autoPlayVideo
          videoActive={videoActive}
        />
      ) : null}
      <MobileFeedActionRow
        actions={[
          {
            accessibilityLabel: item.media?.viewerHasLiked
              ? "Unlike media post"
              : "Like media post",
            active: item.media?.viewerHasLiked,
            count: item.media?.likeCount ?? 0,
            disabled: actionsDisabled,
            icon: item.media?.viewerHasLiked ? "fish" : "fish-outline",
            label: "Fish",
            onPress: onMediaLike,
          },
          {
            accessibilityLabel: "Open media comments",
            disabled: !item.media?.postId,
            count: item.media?.commentCount ?? 0,
            icon: "chatbubble-outline",
            label: "Comments",
            onPress: () => setCommentsOpen(true),
          },
          {
            accessibilityLabel: "Open media post",
            disabled: !item.href,
            icon: "open-outline",
            label: "Open",
            onPress: () => openHref(item.href),
          },
          {
            accessibilityLabel: "Share media post",
            icon: "share-outline",
            label: "Share",
            onPress: () => void shareFeedItem(item),
          },
        ]}
      />
      <MediaPostCommentsSheet
        onClose={() => setCommentsOpen(false)}
        postId={item.media?.postId}
        visible={commentsOpen}
      />
    </MobileFeedArticle>
  );
}

export function MobileChikaFeedItem({
  actionsDisabled,
  item,
  onChikaVote,
  onNotInterested,
}: CommonFeedItemProps) {
  const nextUpvote = item.chika?.userReaction === "upvote" ? null : "upvote";
  const nextDownvote =
    item.chika?.userReaction === "downvote" ? null : "downvote";

  return (
    <MobileFeedArticle item={item} onNotInterested={onNotInterested}>
      <LinkedTextBlock body={item.body} href={item.href} title={item.title} />
      <MetadataStrip values={item.tags} />
      <MobileFeedActionRow
        actions={[
          {
            accessibilityLabel: "Upvote Chika",
            active: item.chika?.userReaction === "upvote",
            count: item.chika?.voteCount ?? 0,
            disabled: actionsDisabled,
            icon: "arrow-up-circle-outline",
            label: "Up",
            onPress: () => onChikaVote?.(nextUpvote),
          },
          {
            accessibilityLabel: "Downvote Chika",
            active: item.chika?.userReaction === "downvote",
            disabled: actionsDisabled,
            icon: "arrow-down-circle-outline",
            label: "Down",
            onPress: () => onChikaVote?.(nextDownvote),
          },
          {
            accessibilityLabel: "Open Chika comments",
            count: item.chika?.replyCount ?? 0,
            icon: "chatbubble-outline",
            label: "Replies",
            disabled: !item.href,
            onPress: item.href ? () => openHref(item.href) : undefined,
          },
          {
            accessibilityLabel: "Share Chika",
            icon: "share-outline",
            label: "Share",
            onPress: () => void shareFeedItem(item),
          },
        ]}
      />
    </MobileFeedArticle>
  );
}

export function MobileEventFeedItem({
  item,
  onNotInterested,
}: CommonFeedItemProps) {
  return (
    <MobileFeedArticle item={item} onNotInterested={onNotInterested}>
      <LinkedTextBlock body={item.body} href={item.href} title={item.title} />
      <MetadataStrip
        values={[
          item.eventMemberCount != null
            ? `${item.eventMemberCount.toLocaleString()} divers`
            : "",
          ...item.tags,
        ].filter(Boolean)}
      />
      <MobileFeedActionRow
        actions={[
          {
            accessibilityLabel: "Open event",
            icon: "calendar-outline",
            label: "View event",
            disabled: !item.href,
            onPress: () => openHref(item.href),
          },
          {
            accessibilityLabel: "Share event",
            icon: "share-outline",
            label: "Share",
            onPress: () => void shareFeedItem(item),
          },
        ]}
      />
    </MobileFeedArticle>
  );
}

export function MobileDiveReportFeedItem({
  item,
  onNotInterested,
}: CommonFeedItemProps) {
  return (
    <MobileFeedArticle item={item} onNotInterested={onNotInterested}>
      <LinkedTextBlock
        body={item.body || "Dive conditions update"}
        href={item.href}
        title={item.diveSiteName || item.title}
      />
      <MetadataStrip values={item.tags} />
      <MobileFeedActionRow
        actions={[
          {
            accessibilityLabel: "Open dive spot",
            icon: "compass-outline",
            label: "View report",
            disabled: !item.href,
            onPress: () => openHref(item.href),
          },
          {
            accessibilityLabel: "Share dive report",
            icon: "share-outline",
            label: "Share",
            onPress: () => void shareFeedItem(item),
          },
        ]}
      />
    </MobileFeedArticle>
  );
}

export function MobileBuddySignalFeedItem({
  item,
  onNotInterested,
}: CommonFeedItemProps) {
  return (
    <MobileFeedArticle item={item} onNotInterested={onNotInterested}>
      <LinkedTextBlock
        body={item.body}
        href={item.href}
        title={item.intentType || item.title}
      />
      <MetadataStrip values={item.tags} />
      <MobileFeedActionRow
        actions={[
          {
            accessibilityLabel: "Open buddy profile",
            icon: "person-circle-outline",
            label: "Profile",
            disabled: !item.href,
            onPress: () => openHref(item.href),
          },
          {
            accessibilityLabel: "Open buddy finder",
            icon: "people-outline",
            label: "Buddies",
            onPress: () => router.push("/(app)/(tabs)/(home)/buddies"),
          },
          {
            accessibilityLabel: "Share buddy post",
            icon: "share-outline",
            label: "Share",
            onPress: () => void shareFeedItem(item),
          },
        ]}
      />
    </MobileFeedArticle>
  );
}

export function MobileUnknownFeedItem({
  item,
  onNotInterested,
}: CommonFeedItemProps) {
  return (
    <MobileFeedArticle item={item} onNotInterested={onNotInterested}>
      <View className="gap-2 px-4">
        <View className="flex-row items-center gap-2">
          <Ionicons color="#64748b" name="radio-outline" size={18} />
          <Text className="text-sm font-semibold text-foreground">
            {item.title}
          </Text>
        </View>
        {item.body ? (
          <Text
            className="text-sm leading-6 text-muted-foreground"
            numberOfLines={4}
          >
            {item.body}
          </Text>
        ) : null}
      </View>
      <MobileFeedActionRow
        actions={[
          {
            accessibilityLabel: "Open feed item",
            icon: "open-outline",
            label: "Open",
            disabled: !item.href,
            onPress: () => openHref(item.href),
          },
        ]}
      />
    </MobileFeedArticle>
  );
}
