import { Image } from "expo-image";
import { Stack, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

import {
  MobileEmptyState,
  MobileErrorState,
  MobileLoadingState,
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";
import { EventDetailRow } from "@/features/events/components/event-detail-row";
import { useEventDetailQuery } from "@/features/events/hooks/use-event-detail-query";
import {
  eventDifficultyLabel,
  eventLocationLabel,
  eventPriceLabel,
  eventSummary,
  eventTypeLabel,
  formatEventDate,
  safeImageUrl,
  stripMarkdownPreview,
  titleCase,
} from "@/features/events/lib/event-format";

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export function EventDetailScreen() {
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const slug = firstParam(params.slug);
  const eventQuery = useEventDetailQuery(slug);
  const event = eventQuery.data?.event;

  if (!slug) {
    return (
      <MobileScrollScreen subtitle="Event" title="Events">
        <MobileEmptyState
          description="Choose an event from the calendar to see its details."
          title="Event not found"
        />
      </MobileScrollScreen>
    );
  }

  if (eventQuery.isLoading) {
    return (
      <MobileScrollScreen subtitle="Event" title="Events">
        <MobileLoadingState message="Loading event." />
      </MobileScrollScreen>
    );
  }

  if (eventQuery.error) {
    return (
      <MobileScrollScreen subtitle="Event" title="Events">
        <View className="gap-3">
          <MobileErrorState
            message="This event is taking longer than expected to load."
            title="Event unavailable"
          />
          <MobileButton variant="secondary" onPress={() => void eventQuery.refetch()}>
            Try again
          </MobileButton>
        </View>
      </MobileScrollScreen>
    );
  }

  if (!event) {
    return (
      <MobileScrollScreen subtitle="Event" title="Events">
        <MobileEmptyState
          description="This event may have been removed or is not available yet."
          title="Event not found"
        />
      </MobileScrollScreen>
    );
  }

  const coverUrl = safeImageUrl(event.coverPhotoUrl);
  const body = stripMarkdownPreview(event.descriptionMarkdown || event.description);
  const showPaymentInstructions =
    event.visibility === "public" &&
    event.viewerCanViewPrivateDetails &&
    event.paymentMode !== "free" &&
    Boolean(event.paymentInstructions?.trim());

  return (
    <>
      <Stack.Screen options={{ title: event.title }} />
      <MobileScrollScreen subtitle={eventTypeLabel(event.type)} title="Events">
        <MobileSection description={eventSummary(event)} title={event.title}>
          <View className="gap-4">
            {coverUrl ? (
              <Image
                accessibilityLabel=""
                className="h-52 w-full rounded-2xl bg-secondary"
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
                {eventDifficultyLabel(event.difficulty)}
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

            {body ? (
              <Text className="text-sm leading-6 text-muted-foreground">{body}</Text>
            ) : null}
          </View>
        </MobileSection>

        <MobileSection title="Event details">
          <View className="gap-3">
            <EventDetailRow
              label="Schedule"
              value={formatEventDate(event.startsAt, event.endsAt, event.timezone)}
            />
            <EventDetailRow label="Location" value={eventLocationLabel(event)} />
            <EventDetailRow label="Meeting point" value={event.meetingPoint} />
            <EventDetailRow label="Confirmed" value={event.goingCount} />
            <EventDetailRow label="Interested" value={event.interestedCount} />
            <EventDetailRow
              label="Capacity"
              value={event.capacity ? `${event.capacity} divers` : undefined}
            />
          </View>
        </MobileSection>

        <MobileSection title="Dive information">
          <View className="gap-3">
            <EventDetailRow label="Type" value={eventTypeLabel(event.type)} />
            <EventDetailRow
              label="Difficulty"
              value={eventDifficultyLabel(event.difficulty)}
            />
            <EventDetailRow
              label="Maximum depth"
              value={event.maxDepthM ? `${event.maxDepthM}m` : undefined}
            />
            <EventDetailRow label="Entry" value={titleCase(event.entryType)} />
            <EventDetailRow label="Equipment notes" value={event.equipmentNotes} />
            <EventDetailRow label="Safety notes" value={event.safetyNotes} />
          </View>
        </MobileSection>

        <MobileSection title="Attendance">
          <View className="gap-3">
            <EventDetailRow
              label="Price"
              value={eventPriceLabel(event)}
            />
            <EventDetailRow
              label="Approval"
              value={event.requiresApproval ? "Approval required" : "No approval required"}
            />
            {showPaymentInstructions ? (
              <EventDetailRow
                label="Payment instructions"
                value={event.paymentInstructions}
              />
            ) : null}
            <EventDetailRow
              label="Cancellation"
              value={event.cancellationPolicy}
            />
          </View>
        </MobileSection>
      </MobileScrollScreen>
    </>
  );
}
