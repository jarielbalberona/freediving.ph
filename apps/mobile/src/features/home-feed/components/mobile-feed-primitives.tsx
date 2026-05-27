import Ionicons from "@expo/vector-icons/Ionicons";
import { BottomSheet } from "@expo/ui";
import { Galeria } from "@nandorojo/galeria";
import { Image } from "expo-image";
import { Pressable, Share, Text, View } from "react-native";

import type {
  HomeActivityCardModel,
  HomeActivityMediaItem,
} from "@/features/home-feed/lib/activity-card-model";

const relativeTime = (value: string) => {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "";
  const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSeconds < 60) return "now";
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) return `${diffWeeks}w`;
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(
    new Date(value),
  );
};

const initialsFor = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export function MobileFeedPostHeader({
  item,
  onMorePress,
}: {
  item: HomeActivityCardModel;
  onMorePress?: () => void;
}) {
  const name = item.actorName || item.title || "Community member";
  const metadata = [
    item.area || item.diveSiteName,
    item.sourceLabel,
    relativeTime(item.occurredAt),
  ].filter(Boolean);

  return (
    <View className="flex-row items-center gap-3 px-4">
      {item.actorAvatarUrl ? (
        <Image
          accessibilityLabel=""
          cachePolicy="memory-disk"
          className="size-10 rounded-full bg-secondary"
          contentFit="cover"
          source={{ uri: item.actorAvatarUrl }}
          transition={120}
        />
      ) : (
        <View className="size-10 items-center justify-center rounded-full bg-primary/10">
          <Text className="text-xs font-semibold text-primary">{initialsFor(name)}</Text>
        </View>
      )}
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
          {name}
        </Text>
        {metadata.length > 0 ? (
          <Text className="text-xs text-muted-foreground" numberOfLines={1}>
            {metadata.join(" · ")}
          </Text>
        ) : null}
      </View>
      {onMorePress ? (
        <Pressable
          accessibilityLabel="More feed actions"
          className="size-10 items-center justify-center rounded-full active:bg-secondary"
          hitSlop={8}
          onPress={onMorePress}
        >
          <Ionicons color="#64748b" name="ellipsis-horizontal" size={20} />
        </Pressable>
      ) : null}
    </View>
  );
}

type FeedAction = {
  accessibilityLabel: string;
  active?: boolean;
  count?: number;
  disabled?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
};

export function MobileFeedActionRow({ actions }: { actions: FeedAction[] }) {
  return (
    <View className="flex-row items-center gap-1 px-3">
      {actions.map((action) => (
        <Pressable
          accessibilityLabel={action.accessibilityLabel}
          accessibilityRole="button"
          className={`min-h-10 flex-row items-center gap-1.5 rounded-full px-3 active:bg-secondary ${
            action.disabled ? "opacity-45" : ""
          }`}
          disabled={action.disabled}
          key={action.accessibilityLabel}
          onPress={action.disabled ? undefined : action.onPress}
        >
          <Ionicons
            color={action.active ? "#0677A8" : "#475569"}
            name={action.icon}
            size={19}
          />
          <Text
            className={`text-sm font-medium ${
              action.active ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {typeof action.count === "number"
              ? action.count.toLocaleString()
              : action.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function MobileFeedOverflowMenu({
  item,
  onClose,
  onNotInterested,
  visible,
}: {
  item: HomeActivityCardModel;
  onClose: () => void;
  onNotInterested?: () => void;
  visible: boolean;
}) {
  return (
    <BottomSheet isPresented={visible} onDismiss={onClose}>
      <View className="gap-4 bg-background pb-6">
        <View>
          <Text className="mb-1 text-base font-semibold text-foreground">
            Feed options
          </Text>
          <Text className="text-sm text-muted-foreground" numberOfLines={2}>
            {item.title}
          </Text>
        </View>
        {onNotInterested ? (
          <Pressable
            accessibilityRole="button"
            className="min-h-12 flex-row items-center gap-3 rounded-2xl px-2 active:bg-secondary"
            onPress={() => {
              onClose();
              onNotInterested();
            }}
          >
            <Ionicons color="#475569" name="eye-off-outline" size={20} />
            <Text className="text-sm font-semibold text-foreground">
              Show me less like this
            </Text>
          </Pressable>
        ) : null}
      </View>
    </BottomSheet>
  );
}

export function MobileFeedCommentsSheet({
  item,
  onClose,
  onOpenDetail,
  visible,
}: {
  item: HomeActivityCardModel;
  onClose: () => void;
  onOpenDetail?: () => void;
  visible: boolean;
}) {
  return (
    <BottomSheet
      isPresented={visible}
      onDismiss={onClose}
      snapPoints={[{ fraction: 0.45 }]}
    >
      <View className="gap-3 bg-background pb-5">
        <View>
          <Text className="text-base font-semibold text-foreground">Comments</Text>
          <Text className="mt-1 text-sm text-muted-foreground" numberOfLines={1}>
            {item.title}
          </Text>
        </View>
        <Text className="text-sm leading-6 text-muted-foreground">
          Comments open on the full post for this feed item.
        </Text>
        {onOpenDetail ? (
          <Pressable
            accessibilityRole="button"
            className="min-h-12 items-center justify-center rounded-2xl bg-primary px-4"
            onPress={() => {
              onClose();
              onOpenDetail();
            }}
          >
            <Text className="text-sm font-semibold text-primary-foreground">
              Open post
            </Text>
          </Pressable>
        ) : null}
      </View>
    </BottomSheet>
  );
}

export function MobileMediaGalleryPreview({
  accessibilityLabel,
  hidePageIndicators = false,
  items,
  previewUrl,
  showMultipleBadge,
}: {
  accessibilityLabel: string;
  hidePageIndicators?: boolean;
  items: MobileViewerMediaItem[];
  previewUrl: string;
  showMultipleBadge?: boolean;
}) {
  if (items.length === 0) {
    return (
      <Image
        accessibilityLabel={accessibilityLabel}
        cachePolicy="memory-disk"
        className="w-full bg-secondary"
        contentFit="cover"
        source={{ uri: previewUrl }}
        style={{ aspectRatio: 4 / 5 }}
        transition={150}
      />
    );
  }

  return (
    <Galeria
      closeIconName="xmark"
      hidePageIndicators={hidePageIndicators}
      theme="dark"
      urls={items.map((item) => item.url)}
    >
      <View className="relative">
        {items.map((galleryItem, index) => {
          const visible = index === 0;
          const sourceUrl = visible ? previewUrl : galleryItem.url;

          return (
            <Galeria.Image
              index={index}
              key={galleryItem.id}
              style={
                visible
                  ? { aspectRatio: 4 / 5, width: "100%" }
                  : {
                      height: 1,
                      opacity: 0,
                      position: "absolute",
                      width: 1,
                    }
              }
            >
              <Image
                accessibilityLabel={visible ? accessibilityLabel : ""}
                cachePolicy="memory-disk"
                className={visible ? "w-full bg-secondary" : ""}
                contentFit="cover"
                source={{ uri: sourceUrl }}
                style={visible ? { aspectRatio: 4 / 5 } : { height: 1, width: 1 }}
                transition={visible ? 150 : 0}
              />
            </Galeria.Image>
          );
        })}
        {showMultipleBadge ? (
          <View className="absolute right-3 top-3 flex-row items-center gap-1 rounded-full bg-black/60 px-2.5 py-1">
            <Ionicons color="white" name="images-outline" size={14} />
            <Text className="text-xs font-semibold text-white">{items.length}</Text>
          </View>
        ) : null}
      </View>
    </Galeria>
  );
}

export type MobileViewerMediaItem = {
  alt?: string | null;
  height?: number | null;
  id: string;
  url: string;
  width?: number | null;
};

export const viewerMediaItemsFromFeedMedia = (
  items: HomeActivityMediaItem[],
): MobileViewerMediaItem[] =>
  items
    .map((item) => ({
      alt: null,
      height: item.height ?? null,
      id: item.id,
      url: item.dialogUrl || item.previewUrl || "",
      width: item.width ?? null,
    }))
    .filter((item) => item.url);

export const shareFeedItem = async (item: HomeActivityCardModel) => {
  const message = item.body ? `${item.title}\n\n${item.body}` : item.title;
  await Share.share({ message });
};
