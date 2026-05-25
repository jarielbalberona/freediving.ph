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
  item: HomeActivityCardModel;
  onAction?: () => void;
};

function HomeActivityCardContent({ item, onAction }: HomeActivityCardProps) {
  const occurredAt = formatActivityDate(item.occurredAt);

  return (
    <MobileCard>
      <View className="gap-3">
        <View className="flex-row items-center justify-between gap-3">
          <Text className="text-xs font-semibold uppercase tracking-wide text-primary">
            {item.sourceLabel}
          </Text>
          {occurredAt ? (
            <Text className="text-xs text-muted-foreground">{occurredAt}</Text>
          ) : null}
        </View>

        {item.thumbnailUrl ? (
          <Image
            accessibilityLabel=""
            className="h-40 w-full rounded-xl bg-secondary"
            contentFit="cover"
            source={{ uri: item.thumbnailUrl }}
            transition={150}
          />
        ) : null}

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

        <View className="flex-row flex-wrap gap-2">
          {item.actorName ? (
            <Text className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              {item.actorName}
            </Text>
          ) : null}
          {item.area ? (
            <Text className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              {item.area}
            </Text>
          ) : null}
        </View>

        {onAction ? (
          <MobileButton variant="secondary" onPress={onAction}>
            React
          </MobileButton>
        ) : null}
      </View>
    </MobileCard>
  );
}

export function HomeActivityCard({ item, onAction }: HomeActivityCardProps) {
  if (!item.href) {
    return <HomeActivityCardContent item={item} onAction={onAction} />;
  }

  return (
    <Link href={item.href} asChild>
      <Pressable accessibilityRole="link">
        <HomeActivityCardContent item={item} onAction={onAction} />
      </Pressable>
    </Link>
  );
}
