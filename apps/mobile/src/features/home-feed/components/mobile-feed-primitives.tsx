import Ionicons from "@expo/vector-icons/Ionicons";
import { BottomSheet } from "@expo/ui";
import { PagerView } from "@expo/ui/community/pager-view";
import { Galeria } from "@nandorojo/galeria";
import { Image } from "expo-image";
import { useState } from "react";
import {
  type LayoutChangeEvent,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";

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
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
};

const initialsFor = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const MEDIA_PREVIEW_ASPECT_RATIO = 4 / 5;
const MEDIA_PREVIEW_BLUR_RADIUS = 28;
const MEDIA_PREVIEW_DIM_STYLE = [
  StyleSheet.absoluteFill,
  { backgroundColor: "rgba(10, 31, 46, 0.18)" },
];
const MEDIA_PREVIEW_FILL_STYLE = StyleSheet.absoluteFill;

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
          <Text className="text-xs font-semibold text-primary">
            {initialsFor(name)}
          </Text>
        </View>
      )}
      <View className="min-w-0 flex-1">
        <Text
          className="text-sm font-semibold text-foreground"
          numberOfLines={1}
        >
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
          <Text className="text-base font-semibold text-foreground">
            Comments
          </Text>
          <Text
            className="mt-1 text-sm text-muted-foreground"
            numberOfLines={1}
          >
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
  items,
  previewUrl,
  showMultipleBadge,
}: {
  accessibilityLabel: string;
  items: MobileViewerMediaItem[];
  previewUrl: string;
  showMultipleBadge?: boolean;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const mediaItems = normalizeViewerMediaItems(items, previewUrl);
  const viewerUrls = mediaItems.map((item) => item.viewerUrl);
  const viewportHeight = viewportWidth / MEDIA_PREVIEW_ASPECT_RATIO;
  const measuredViewportStyle =
    viewportWidth > 0
      ? { height: viewportHeight, width: viewportWidth }
      : { height: "100%" as const, width: "100%" as const };
  const handlePreviewLayout = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    if (nextWidth > 0 && Math.abs(nextWidth - viewportWidth) > 0.5) {
      setViewportWidth(nextWidth);
    }
  };

  if (mediaItems.length === 0) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Media gallery preview has no renderable media", {
        itemCount: items.length,
        previewUrl: Boolean(previewUrl),
      });
    }
    return null;
  }

  if (mediaItems.length === 1) {
    const item = mediaItems[0];
    return (
      <Galeria closeIconName="xmark" theme="light" urls={viewerUrls}>
        <View
          className="relative overflow-hidden bg-secondary"
          onLayout={handlePreviewLayout}
          style={{ aspectRatio: MEDIA_PREVIEW_ASPECT_RATIO, width: "100%" }}
        >
          <Image
            accessibilityLabel=""
            blurRadius={MEDIA_PREVIEW_BLUR_RADIUS}
            cachePolicy="memory-disk"
            contentFit="cover"
            contentPosition="center"
            source={{ uri: item.previewUrl }}
            style={MEDIA_PREVIEW_FILL_STYLE}
          />
          <View pointerEvents="none" style={MEDIA_PREVIEW_DIM_STYLE} />
          <Galeria.Image index={0} style={measuredViewportStyle}>
            <Image
              accessibilityLabel={accessibilityLabel}
              cachePolicy="memory-disk"
              contentPosition="center"
              contentFit="cover"
              source={{ uri: item.previewUrl }}
              style={measuredViewportStyle}
              transition={150}
            />
          </Galeria.Image>
        </View>
      </Galeria>
    );
  }

  return (
    <Galeria closeIconName="xmark" theme="light" urls={viewerUrls}>
      <View
        className="relative overflow-hidden bg-secondary"
        onLayout={handlePreviewLayout}
        style={{ aspectRatio: MEDIA_PREVIEW_ASPECT_RATIO, width: "100%" }}
      >
        <PagerView
          initialPage={0}
          onPageSelected={(event) => setActiveIndex(event.nativeEvent.position)}
          style={measuredViewportStyle}
        >
          {mediaItems.map((galleryItem, index) => (
            <View
              key={galleryItem.id}
              style={measuredViewportStyle}
            >
              <Image
                accessibilityLabel=""
                blurRadius={MEDIA_PREVIEW_BLUR_RADIUS}
                cachePolicy="memory-disk"
                contentFit="cover"
                contentPosition="center"
                source={{ uri: galleryItem.previewUrl }}
                style={MEDIA_PREVIEW_FILL_STYLE}
              />
              <View pointerEvents="none" style={MEDIA_PREVIEW_DIM_STYLE} />
              <Galeria.Image index={index} style={measuredViewportStyle}>
                <Image
                  accessibilityLabel={
                    index === activeIndex
                      ? mediaItems.length > 1
                        ? `${accessibilityLabel}, image ${index + 1} of ${mediaItems.length}`
                        : accessibilityLabel
                      : ""
                  }
                  cachePolicy="memory-disk"
                  contentPosition="center"
                  contentFit="cover"
                  source={{ uri: galleryItem.previewUrl }}
                  style={measuredViewportStyle}
                  transition={150}
                />
              </Galeria.Image>
            </View>
          ))}
        </PagerView>
        {showMultipleBadge ? (
          <View className="absolute right-3 top-3 rounded-full bg-black/55 p-1.5">
            <Ionicons color="white" name="images-outline" size={14} />
          </View>
        ) : null}
      </View>
    </Galeria>
  );
}

export type MobileViewerMediaItem = {
  alt?: string | null;
  displayUrl?: string;
  height?: number | null;
  id: string;
  previewUrl?: string;
  thumbnailUrl?: string;
  viewerUrl?: string;
  width?: number | null;
};

type NormalizedViewerMediaItem = MobileViewerMediaItem & {
  previewUrl: string;
  viewerUrl: string;
};

const normalizeViewerMediaItems = (
  items: MobileViewerMediaItem[],
  fallbackPreviewUrl: string,
): NormalizedViewerMediaItem[] =>
  items
    .map((item, index) => {
      const preview =
        item.previewUrl ||
        item.displayUrl ||
        item.thumbnailUrl ||
        item.viewerUrl ||
        (index === 0 ? fallbackPreviewUrl : undefined);
      const viewer =
        item.viewerUrl || item.displayUrl || item.previewUrl || item.thumbnailUrl;

      if (!preview && !viewer) return null;

      return {
        ...item,
        id: item.id || `media-${index + 1}`,
        previewUrl: preview || viewer || fallbackPreviewUrl,
        viewerUrl: viewer || preview || fallbackPreviewUrl,
      };
    })
    .filter((item): item is NormalizedViewerMediaItem => Boolean(item));

export const viewerMediaItemsFromFeedMedia = (
  items: HomeActivityMediaItem[],
): MobileViewerMediaItem[] =>
  items
    .map((item) => ({
      alt: null,
      displayUrl: item.displayUrl,
      height: item.height ?? null,
      id: item.id,
      previewUrl: item.previewUrl,
      thumbnailUrl: item.thumbnailUrl,
      viewerUrl:
        item.dialogUrl || item.displayUrl || item.previewUrl || item.thumbnailUrl,
      width: item.width ?? null,
    }))
    .filter((item) => item.previewUrl || item.viewerUrl);

export const shareFeedItem = async (item: HomeActivityCardModel) => {
  const message = item.body ? `${item.title}\n\n${item.body}` : item.title;
  await Share.share({ message });
};
