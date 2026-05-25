import { Image } from "expo-image";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { MobileCard } from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";
import type { HomeActivityCardModel } from "@/features/home-feed/lib/activity-card-model";

const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
});

const formatActivityDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : dateFormatter.format(date);
};

type HomeActivityCardProps = {
  actionsDisabled?: boolean;
  item: HomeActivityCardModel;
  onChikaVote?: (reaction: "upvote" | "downvote" | null) => void;
  onMediaLike?: () => void;
  onNotInterested?: () => void;
};

const typeToneClass: Record<HomeActivityCardModel["cardType"], string> = {
  buddy_signal: "bg-emerald-100 text-emerald-900",
  chika: "bg-teal-100 text-teal-900",
  dive_report: "bg-cyan-100 text-cyan-900",
  event: "bg-amber-100 text-amber-900",
  media_post: "bg-sky-100 text-sky-900",
  unknown: "bg-secondary text-secondary-foreground",
};

function TagList({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  return (
    <View className="flex-row flex-wrap gap-2">
      {tags.map((tag) => (
        <Text
          key={tag}
          className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
        >
          {tag}
        </Text>
      ))}
    </View>
  );
}

function ViewAction({ item }: { item: HomeActivityCardModel }) {
  if (!item.href) return null;
  return (
    <Link href={item.href} asChild>
      <Pressable
        accessibilityRole="link"
        className="min-h-11 items-center justify-center rounded-xl border border-border bg-secondary px-4"
      >
        <Text className="text-sm font-semibold text-secondary-foreground">
          View
        </Text>
      </Pressable>
    </Link>
  );
}

function ChikaActions({
  disabled,
  item,
  onVote,
}: {
  disabled?: boolean;
  item: HomeActivityCardModel;
  onVote?: (reaction: "upvote" | "downvote" | null) => void;
}) {
  if (!item.chika || !onVote) return null;
  const nextUpvote = item.chika.userReaction === "upvote" ? null : "upvote";
  const nextDownvote =
    item.chika.userReaction === "downvote" ? null : "downvote";
  return (
    <View className="flex-row flex-wrap gap-2">
      <MobileButton
        disabled={disabled}
        variant={item.chika.userReaction === "upvote" ? "primary" : "secondary"}
        onPress={() => onVote(nextUpvote)}
      >
        Up · {item.chika.voteCount}
      </MobileButton>
      <MobileButton
        disabled={disabled}
        variant={item.chika.userReaction === "downvote" ? "primary" : "secondary"}
        onPress={() => onVote(nextDownvote)}
      >
        Down
      </MobileButton>
    </View>
  );
}

function MediaActions({
  disabled,
  item,
  onLike,
}: {
  disabled?: boolean;
  item: HomeActivityCardModel;
  onLike?: () => void;
}) {
  if (!item.media || !onLike) return null;
  return (
    <MobileButton
      disabled={disabled}
      variant={item.media.viewerHasLiked ? "primary" : "secondary"}
      onPress={onLike}
    >
      {item.media.viewerHasLiked ? "Liked" : "Like"} · {item.media.likeCount}
    </MobileButton>
  );
}

function CardBody({ item }: { item: HomeActivityCardModel }) {
  if (item.cardType === "media_post") {
    return (
      <View className="gap-3">
        {item.media?.thumbnailUrl ? (
          <Image
            accessibilityLabel=""
            className="h-44 w-full rounded-xl bg-secondary"
            contentFit="cover"
            source={{ uri: item.media.thumbnailUrl }}
            transition={150}
          />
        ) : null}
        {item.body ? (
          <Text className="text-sm leading-6 text-foreground" numberOfLines={4}>
            {item.body}
          </Text>
        ) : null}
      </View>
    );
  }

  if (item.cardType === "event") {
    return (
      <View className="gap-2">
        <Text className="text-base font-semibold leading-6 text-foreground">
          {item.title}
        </Text>
        {item.body ? (
          <Text className="text-sm leading-6 text-muted-foreground" numberOfLines={3}>
            {item.body}
          </Text>
        ) : null}
      </View>
    );
  }

  if (item.cardType === "buddy_signal") {
    return (
      <View className="gap-2">
        <Text className="text-base font-semibold leading-6 text-foreground">
          {item.intentType || item.title}
        </Text>
        {item.body ? (
          <Text className="text-sm leading-6 text-muted-foreground" numberOfLines={3}>
            {item.body}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View className="gap-2">
      <Text className="text-base font-semibold leading-6 text-foreground">
        {item.title}
      </Text>
      {item.body && item.body !== item.title ? (
        <Text className="text-sm leading-6 text-muted-foreground" numberOfLines={4}>
          {item.body}
        </Text>
      ) : null}
    </View>
  );
}

export function HomeActivityCard({
  actionsDisabled = false,
  item,
  onChikaVote,
  onMediaLike,
  onNotInterested,
}: HomeActivityCardProps) {
  const occurredAt = formatActivityDate(item.occurredAt);

  return (
    <MobileCard>
      <View className="gap-3">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-1">
            <Text
              className={`self-start rounded-full px-2 py-1 text-xs font-semibold ${typeToneClass[item.cardType]}`}
            >
              {item.sourceLabel}
            </Text>
            <Text className="text-xs text-muted-foreground">
              {item.actorName || "Community member"}
              {item.area ? ` · ${item.area}` : ""}
            </Text>
          </View>
          {occurredAt ? (
            <Text className="text-xs text-muted-foreground">{occurredAt}</Text>
          ) : null}
        </View>

        <CardBody item={item} />
        <TagList tags={item.tags} />

        <View className="flex-row flex-wrap items-center gap-2">
          <ChikaActions
            disabled={actionsDisabled}
            item={item}
            onVote={onChikaVote}
          />
          <MediaActions
            disabled={actionsDisabled}
            item={item}
            onLike={onMediaLike}
          />
          <ViewAction item={item} />
          {onNotInterested ? (
            <MobileButton
              disabled={actionsDisabled}
              variant="ghost"
              onPress={onNotInterested}
            >
              Not interested
            </MobileButton>
          ) : null}
        </View>
      </View>
    </MobileCard>
  );
}
