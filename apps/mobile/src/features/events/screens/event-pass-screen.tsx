import { Stack, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

import {
  MobileCard,
  MobileEmptyState,
  MobileErrorState,
  MobileLoadingState,
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";
import { EventDetailRow } from "@/features/events/components/event-detail-row";
import { useEventPassVerificationQuery } from "@/features/events/hooks/use-event-attendee-queries";
import { eventLocationLabel, formatEventDate } from "@/features/events/lib/event-format";

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const statusLabel = (value: string | undefined) =>
  (value ?? "")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Unknown";

export function EventPassScreen() {
  const params = useLocalSearchParams<{
    slug?: string | string[];
    token?: string | string[];
  }>();
  const slug = firstParam(params.slug);
  const token = firstParam(params.token);
  const passQuery = useEventPassVerificationQuery(slug, token);
  const pass = passQuery.data;

  return (
    <MobileScrollScreen subtitle="Event pass" title="Pass">
      <Stack.Screen options={{ title: "Event pass" }} />

      {!slug || !token ? (
        <MobileEmptyState
          description="Open the pass link from an event detail screen or notification."
          title="Pass unavailable"
        />
      ) : null}

      {passQuery.isLoading ? (
        <MobileLoadingState message="Checking event pass." />
      ) : null}

      {passQuery.error ? (
        <View className="gap-3">
          <MobileErrorState
            message="This pass is unavailable, expired, or not visible to this session."
            title="Pass unavailable"
          />
          <MobileButton variant="secondary" onPress={() => void passQuery.refetch()}>
            Try again
          </MobileButton>
        </View>
      ) : null}

      {pass ? (
        <View className="gap-4">
          <MobileSection title={pass.event.title}>
            <MobileCard>
              <View className="gap-2">
                <EventDetailRow
                  label="Schedule"
                  value={formatEventDate(
                    pass.event.startsAt,
                    pass.event.endsAt,
                    pass.event.timezone,
                  )}
                />
                <EventDetailRow
                  label="Location"
                  value={eventLocationLabel(pass.event)}
                />
                <EventDetailRow
                  label="Participant"
                  value={
                    pass.participant.displayName ||
                    pass.participant.username ||
                    "Participant"
                  }
                />
                <EventDetailRow
                  label="Participant status"
                  value={statusLabel(pass.status)}
                />
                <EventDetailRow
                  label="Payment status"
                  value={statusLabel(pass.payment?.status)}
                />
                <EventDetailRow
                  label="Pass token"
                  value={pass.participant.qrToken || token}
                />
                <Text className="text-xs leading-5 text-muted-foreground">
                  This is a read-only mobile pass view. Organizer check-in and
                  overrides belong to event management.
                </Text>
              </View>
            </MobileCard>
          </MobileSection>
        </View>
      ) : null}
    </MobileScrollScreen>
  );
}
