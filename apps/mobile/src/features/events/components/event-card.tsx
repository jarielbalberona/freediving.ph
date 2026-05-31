import { Image } from "expo-image";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import type { Event } from "@freediving.ph/types";

import { SocialListRow, SocialMetadataLine, StatusPill } from "@/components/social";
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
  const coverUrl = safeImageUrl(event.coverUrl ?? event.coverPhotoUrl ?? undefined);
  const pendingApproval = event.viewerEventState === "pending_approval";

  return (
    <SocialListRow
      body={eventSummary(event)}
      meta={[
        eventTypeLabel(event.type),
        eventPriceLabel(event),
        event.beginnerFriendly ? "Beginner friendly" : undefined,
      ]}
      name="Event"
      title={event.title}
    >
      {coverUrl ? (
        <Image
          accessibilityLabel=""
          className="mb-3 w-full rounded-xl bg-secondary"
          contentFit="cover"
          source={{ uri: coverUrl }}
          style={{ aspectRatio: 4 / 5 }}
          transition={150}
        />
      ) : null}
      <SocialMetadataLine
        values={[
          formatEventDate(event.startsAt, event.endsAt, event.timezone),
          eventLocationLabel(event),
          `${event.goingCount || event.currentAttendees} confirmed${
            event.capacity ? ` · ${event.capacity} capacity` : ""
          }`,
        ]}
      />
      {event.viewerJoined || pendingApproval ? (
        <View className="mt-2 flex-row">
          <StatusPill tone="primary">
            {event.viewerJoined ? "Joined" : "Pending"}
          </StatusPill>
        </View>
      ) : null}
    </SocialListRow>
  );
}

export function EventCard({ event }: EventCardProps) {
  const slug = safeEventSlug(event.slug);

  if (!slug) {
    return <EventCardContent event={event} />;
  }

  return (
    <Link
      href={{
        pathname: "/(app)/(tabs)/(home)/events/[slug]",
        params: { slug },
      }}
      asChild
    >
      <Pressable accessibilityRole="link">
        <EventCardContent event={event} />
      </Pressable>
    </Link>
  );
}
