import { Image } from "expo-image";
import { Pressable, ScrollView, Text, View } from "react-native";

import type { BadgeCategorySummary } from "@freediving.ph/types";

import { safeImageUrl } from "@/features/profiles/lib/profile-format";

type ProfileBadgeSummaryRowProps = {
  items: BadgeCategorySummary[];
  onCategoryPress?: (category: string) => void;
};

export function ProfileBadgeSummaryRow({
  items,
  onCategoryPress,
}: ProfileBadgeSummaryRowProps) {
  const summaries = items.filter((item) => item.count > 0);

  if (summaries.length === 0) {
    return null;
  }

  return (
    <ScrollView
      contentContainerClassName="flex-row gap-2"
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      {summaries.map((item) => {
        const imageUrl = safeImageUrl(item.imageUrl);
        const label = item.identityName || item.label || item.category;
        const badge = (
          <View
            className="relative h-10 w-10 items-center justify-center rounded-full border border-border bg-card"
            testID={`badge-summary-${item.category}`}
          >
            {imageUrl ? (
              <Image
                accessibilityLabel={`${label} badge logo`}
                contentFit="contain"
                source={{ uri: imageUrl }}
                style={{ height: 34, width: 34 }}
              />
            ) : (
              <View className="h-full w-full items-center justify-center rounded-full bg-secondary">
                <Text className="text-[10px] font-semibold text-secondary-foreground">
                  {label.slice(0, 2).toUpperCase()}
                </Text>
              </View>
            )}
            <View className="absolute -top-1 -right-1 min-w-5 rounded-full border border-white bg-primary px-1.5 py-0.5">
              <Text className="text-[10px] font-bold text-white">{item.count}</Text>
            </View>
          </View>
        );

        if (!onCategoryPress) {
          return (
            <View key={item.category} className="items-center gap-1">
              {badge}
              <Text className="text-[10px] text-muted-foreground">
                {label}
              </Text>
            </View>
          );
        }

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label} ${item.count} badges`}
            className="items-center gap-1"
            key={item.category}
            onPress={() => onCategoryPress(item.category)}
          >
            {badge}
            <Text className="text-[10px] text-muted-foreground">{label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
