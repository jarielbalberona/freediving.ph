import { FlashList } from "@shopify/flash-list";
import { Galeria } from "@nandorojo/galeria";
import { Image } from "expo-image";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { useWindowDimensions } from "react-native";
import type { ProfileMediaItem } from "@freediving.ph/types";

import {
  MobileEmptyState,
  MobileErrorState,
  MobileLoadingState,
} from "@/components/shell";

type ProfileMediaDisplayCompat = {
  displayUrl?: string | null;
  dialogUrl?: string | null;
};

type ProfileMediaCompat = ProfileMediaItem & ProfileMediaDisplayCompat;

const getProfileMediaCompatUrls = (item: ProfileMediaItem) =>
  item as ProfileMediaCompat;

/**
 * Compatibility guard for richer media URL payloads that can appear on web,
 * while this mobile profile media endpoint currently returns thumbnail/preview URLs.
 */

type ProfileMediaGridItem = {
  caption: string | null;
  id: string;
  sourceUrl: string;
  status: "active" | "hidden" | "deleted" | undefined;
  tileHeight: number;
  tileWidth: number;
  type: "photo" | "video";
  viewerUrl: string;
};

const PROFILE_MEDIA_COLUMNS = 3;
const GRID_GAP = 6;
const HORIZONTAL_PADDING = 16;
const FALLBACK_ASPECT_RATIO = 4 / 5;

const clampAspectRatio = (ratio: number) =>
  Number.isFinite(ratio) ? Math.max(0.4, Math.min(ratio, 2.8)) : FALLBACK_ASPECT_RATIO;

const normalizePositiveNumber = (value: number | undefined | null) =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;

const getMediaSourceUrl = (item: ProfileMediaItem) => {
  const {
    displayUrl,
    dialogUrl,
  } = getProfileMediaCompatUrls(item);

  // Compatibility fallback:
  // backend profile media returns thumbnail/preview urls today; displayUrl/dialogUrl
  // are retained to support any richer payload without changing API shape.
  return (
    displayUrl ||
    item.thumbnailUrl ||
    item.previewUrl ||
    dialogUrl ||
    item.playbackUrl
  );
};

const getMediaViewerUrl = (item: ProfileMediaItem) => {
  const {
    displayUrl,
    dialogUrl,
  } = getProfileMediaCompatUrls(item);

  return (
    dialogUrl ||
    displayUrl ||
    item.previewUrl ||
    item.thumbnailUrl ||
    item.playbackUrl
  );
};

const normalizeMedia = (
  item: ProfileMediaItem,
  tileWidth: number,
): ProfileMediaGridItem | null => {
  const sourceUrl = getMediaSourceUrl(item);
  const viewerUrl = getMediaViewerUrl(item);

  if (!sourceUrl || !viewerUrl || !item.id) return null;

  const sourceWidth = normalizePositiveNumber(item.width);
  const sourceHeight = normalizePositiveNumber(item.height);
  const safeRatio = clampAspectRatio(
    sourceWidth && sourceHeight ? sourceHeight / sourceWidth : FALLBACK_ASPECT_RATIO,
  );

  return {
    caption: item.postCaption?.trim() || item.caption?.trim() || null,
    id: item.id,
    sourceUrl,
    status: item.status,
    tileHeight: Math.max(110, Math.round(tileWidth * safeRatio)),
    tileWidth,
    type: item.type,
    viewerUrl,
  };
};

export function ProfileMediaMasonryGrid({
  error,
  hasNextPage,
  isFetchingNextPage,
  isLoading,
  items,
  onLoadMore,
}: {
  error?: unknown;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  items: ProfileMediaItem[];
  onLoadMore: () => void;
}) {
  const { width } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState(0);
  const availableWidth = containerWidth > 0 ? containerWidth : Math.max(width - HORIZONTAL_PADDING, 0);
  const columnCount = PROFILE_MEDIA_COLUMNS;
  const tileWidth = useMemo(
    () =>
      Math.max(
        80,
        Math.floor(
          (availableWidth - HORIZONTAL_PADDING - GRID_GAP * (columnCount - 1)) / columnCount,
        ),
      ),
    [availableWidth, columnCount],
  );

  const normalizedItems = useMemo(
    () =>
      items
        .map((item) => normalizeMedia(item, tileWidth))
        .filter((item): item is ProfileMediaGridItem => item !== null),
    [items, tileWidth],
  );
  const viewerUrls = useMemo(
    () => normalizedItems.map((item) => item.viewerUrl),
    [normalizedItems],
  );

  const onContainerLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.floor(event.nativeEvent.layout.width);
    if (nextWidth > 0 && nextWidth !== containerWidth) {
      setContainerWidth(nextWidth);
    }
  };

  if (isLoading && normalizedItems.length === 0) {
    return <MobileLoadingState message="Loading profile posts." />;
  }

  if (error) {
    return (
      <View className="gap-3">
        <MobileErrorState
          message="Could not load posts for this profile."
          title="Posts unavailable"
        />
        <Pressable
          accessibilityLabel="Retry loading posts"
          accessibilityRole="button"
          className="min-h-10 items-center justify-center rounded-full bg-secondary px-3"
          onPress={onLoadMore}
        >
          <Text className="text-sm font-semibold text-foreground">Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (normalizedItems.length === 0) {
    return <MobileEmptyState description="No public posts to show yet." title="No posts yet" />;
  }

  return (
    <Galeria closeIconName="xmark" theme="light" urls={viewerUrls}>
      <View className="pb-2" onLayout={onContainerLayout}>
        <FlashList<ProfileMediaGridItem>
          data={normalizedItems}
          keyExtractor={(item) => item.id}
          masonry
          numColumns={columnCount}
          onEndReached={hasNextPage ? onLoadMore : undefined}
          onEndReachedThreshold={0.65}
          contentContainerStyle={{
            paddingLeft: Math.max(0, Math.floor(HORIZONTAL_PADDING / 2)),
            paddingRight: Math.max(0, Math.floor(HORIZONTAL_PADDING / 2)),
            paddingTop: 2,
            paddingBottom: 8,
          }}
          renderItem={({ item, index }) => (
            <View
              className="overflow-hidden rounded-lg bg-secondary"
              style={{
                marginBottom: GRID_GAP,
                width: item.tileWidth,
              }}
            >
              <Galeria.Image index={index} style={{ width: item.tileWidth, height: item.tileHeight }}>
                <View
                  style={{
                    width: item.tileWidth,
                    height: item.tileHeight,
                    position: "relative",
                  }}
                >
                  <Image
                    accessibilityLabel={item.caption || "Profile media"}
                    cachePolicy="memory-disk"
                    contentFit="cover"
                    source={{ uri: item.sourceUrl }}
                    style={{
                      backgroundColor: "rgba(15, 23, 42, 0.1)",
                      height: item.tileHeight,
                      width: item.tileWidth,
                    }}
                    transition={150}
                  />
                  {item.type === "video" || item.status === "hidden" ? (
                    <View className="absolute bottom-2 left-2 right-2 flex-row gap-1">
                      {item.type === "video" ? (
                        <View className="rounded-full bg-black/60 px-2 py-0.5">
                          <Text className="text-[10px] font-semibold text-white">Video</Text>
                        </View>
                      ) : null}
                      {item.status === "hidden" ? (
                        <View className="rounded-full bg-black/60 px-2 py-0.5">
                          <Text className="text-[10px] font-semibold text-white">Private</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              </Galeria.Image>
            </View>
          )}
          showsVerticalScrollIndicator={false}
          renderToHardwareTextureAndroid={false}
          scrollEnabled={false}
        />

        {isFetchingNextPage ? (
          <View className="items-center gap-2 py-3">
            <ActivityIndicator color="#64748b" size="small" />
            <Text className="text-xs text-muted-foreground">Loading more posts</Text>
          </View>
        ) : null}
        {hasNextPage ? (
          <Pressable
            accessibilityLabel="Load more posts"
            accessibilityRole="button"
            className="self-center rounded-full border border-border px-3 py-2"
            onPress={onLoadMore}
          >
            <Text className="text-sm text-foreground">Load more posts</Text>
          </Pressable>
        ) : null}
      </View>
    </Galeria>
  );
}
