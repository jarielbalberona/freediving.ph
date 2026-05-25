import { View } from "react-native";

import {
  MobileEmptyState,
  MobileErrorState,
  MobileLoadingState,
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";
import { EventCard } from "@/features/events/components/event-card";
import { useEventsQuery } from "@/features/events/hooks/use-events-query";

export function EventsScreen() {
  const eventsQuery = useEventsQuery();
  const events = eventsQuery.data?.events ?? [];

  return (
    <MobileScrollScreen subtitle="Community calendar" title="Events">
      <MobileSection
        description="Find upcoming freediving sessions, trips, workshops, and community dives."
        title="Upcoming events"
      >
        {eventsQuery.isLoading ? <MobileLoadingState message="Loading events." /> : null}

        {eventsQuery.error ? (
          <View className="gap-3">
            <MobileErrorState
              message="Events are taking longer than expected to load."
              title="Events are unavailable"
            />
            <MobileButton variant="secondary" onPress={() => void eventsQuery.refetch()}>
              Try again
            </MobileButton>
          </View>
        ) : null}

        {!eventsQuery.isLoading && !eventsQuery.error && events.length === 0 ? (
          <MobileEmptyState
            description="No upcoming events yet. Check back as instructors, schools, and organizers share new dives."
            title="No upcoming events yet"
          />
        ) : null}

        {!eventsQuery.isLoading && !eventsQuery.error && events.length > 0 ? (
          <View className="gap-3">
            {events.map((event) => (
              <EventCard event={event} key={event.id} />
            ))}
          </View>
        ) : null}
      </MobileSection>
    </MobileScrollScreen>
  );
}
