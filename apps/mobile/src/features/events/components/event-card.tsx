import { Image } from "expo-image";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import type { Event } from "@freediving.ph/types";

import { MobileCard } from "@/components/shell";
import {
  eventLocationLabel,
  eventPriceLabel,
  eventSummary,
  eventTypeLabel,
  formatEventDate,
  safeEventSlug,
  safeImageUrl,
} from "@/features/events/lib/event-format";

type EventCardProps = {
  event: Event;
};

function EventCardContent({ event }: EventCardProps) {
  const coverUrl = safeImageUrl(event.coverPhotoUrl);

  return (
    <MobileCard>
      <View className="gap-3">
        {coverUrl ? (
          <Image
            accessibilityLabel=""
            className="h-40 w-full rounded-xl bg-secondary"
            contentFit="cover"
            source={{ uri: coverUrl }}
            transition={150}
          />
        ) : null}

        <View className="flex-row flex-wrap gap-2">
          <Text className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            {eventTypeLabel(event.type)}
          </Text>
          <Text className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            {eventPriceLabel(event)}
          </Text>
          {event.beginnerFriendly ? (
            <Text className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              Beginner friendly
            </Text>
          ) : null}
        </View>

        <View className="gap-2">
          <Text className="text-base font-semibold leading-6 text-foreground">
            {event.title}
          </Text>
          <Text className="text-sm leading-6 text-muted-foreground" numberOfLines={3}>
            {eventSummary(event)}
          </Text>
        </View>

        <View className="gap-1">
          <Text className="text-xs text-muted-foreground">
            {formatEventDate(event.startsAt, event.endsAt, event.timezone)}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {eventLocationLabel(event)}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {event.goingCount || event.currentAttendees} confirmed
            {event.capacity ? ` · ${event.capacity} capacity` : ""}
          </Text>
        </View>
      </View>
    </MobileCard>
  );
}

export function EventCard({ event }: EventCardProps) {
  const slug = safeEventSlug(event.slug);

  if (!slug) {
    return <EventCardContent event={event} />;
  }

  return (
    <Link href={{ pathname: "/(app)/events/[slug]", params: { slug } }} asChild>
      <Pressable accessibilityRole="link">
        <EventCardContent event={event} />
      </Pressable>
    </Link>
  );
}
