import { Link } from "expo-router";
import { Image } from "expo-image";
import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import type {
  ProfileDiveSpotHighlight,
} from "@/features/media/hooks/use-profile-media-query";

type ProfileDiveSpotHighlightsProps = {
  highlights: ProfileDiveSpotHighlight[];
};

const formatSpotCount = (count: number) =>
  count === 1 ? "1 post" : `${count} posts`;
const formatMeta = (item: ProfileDiveSpotHighlight) =>
  [item.diveSiteArea, formatSpotCount(item.mediaCount)]
    .filter(Boolean)
    .join(" · ");

function HighlightItem({
  item,
}: {
  item: ProfileDiveSpotHighlight;
}) {
  const content = (
    <View className="items-center gap-1.5">
      <View className="h-16 w-16 overflow-hidden rounded-full border border-border/50">
        {item.coverUrl ? (
          <Image
            cachePolicy="memory-disk"
            contentFit="cover"
            accessibilityLabel={item.diveSpotName}
            source={{ uri: item.coverUrl }}
            style={{ height: "100%", width: "100%" }}
          />
        ) : (
          <View className="h-full w-full items-center justify-center bg-secondary">
            <Text
              className="text-sm font-semibold text-muted-foreground"
              numberOfLines={1}
            >
              {item.diveSpotName[0]?.toUpperCase() ?? "?"}
            </Text>
          </View>
        )}
      </View>
      <Text
        className="w-20 text-center text-xs font-medium text-foreground"
        numberOfLines={1}
      >
        {item.diveSpotName}
      </Text>
      <Text
        className="text-[10px] text-muted-foreground"
        numberOfLines={1}
      >
        {formatMeta(item)}
      </Text>
    </View>
  );

  if (!item.diveSpotSlug) return <View>{content}</View>;

  return (
    <Link
      href={{
        pathname: "/(app)/(tabs)/(home)/explore/[slug]",
        params: { slug: item.diveSpotSlug },
      }}
      asChild
    >
      <Pressable
        accessibilityLabel={`Open dive spot ${item.diveSpotName}`}
        accessibilityRole="link"
      >
        {content}
      </Pressable>
    </Link>
  );
}

export function ProfileDiveSpotHighlights({
  highlights,
}: ProfileDiveSpotHighlightsProps) {
  const visibleHighlights = useMemo(() => highlights, [highlights]);

  if (visibleHighlights.length === 0) return null;

  return (
    <ScrollView
      horizontal
      contentContainerClassName="gap-3 px-4 py-2"
      showsHorizontalScrollIndicator={false}
    >
      {visibleHighlights.map((item) => (
        <HighlightItem key={item.id} item={item} />
      ))}
    </ScrollView>
  );
}
