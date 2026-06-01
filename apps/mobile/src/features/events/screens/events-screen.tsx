import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import type { EventDifficulty, EventFilters, EventType } from "@freediving.ph/types";

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

type EventTypeFilter = EventType | "all";
type DifficultyFilter = EventDifficulty | "all";
type PriceFilter = "all" | "free" | "paid";

const eventTypeFilters: Array<{ label: string; value: EventTypeFilter }> = [
  { label: "All", value: "all" },
  { label: "Fun dives", value: "fun_dive" },
  { label: "Training", value: "line_training" },
  { label: "Courses", value: "certification_course" },
  { label: "Competitions", value: "competition" },
  { label: "Cleanups", value: "cleanup_dive" },
];

const difficultyFilters: Array<{ label: string; value: DifficultyFilter }> = [
  { label: "Any level", value: "all" },
  { label: "Beginner", value: "beginner" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Advanced", value: "advanced" },
];

const priceFilters: Array<{ label: string; value: PriceFilter }> = [
  { label: "Any price", value: "all" },
  { label: "Free", value: "free" },
  { label: "Paid", value: "paid" },
];

function FilterChip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      className={`min-h-10 justify-center rounded-full border px-3 ${
        active ? "border-primary bg-primary/10" : "border-border bg-secondary"
      }`}
      onPress={onPress}
    >
      <Text
        className={`text-xs font-semibold ${
          active ? "text-primary" : "text-secondary-foreground"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function EventsScreen() {
  const [search, setSearch] = useState("");
  const [eventType, setEventType] = useState<EventTypeFilter>("all");
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("all");
  const [price, setPrice] = useState<PriceFilter>("all");
  const [beginnerFriendly, setBeginnerFriendly] = useState(false);
  const filters = useMemo<EventFilters>(
    () => ({
      beginnerFriendly: beginnerFriendly || undefined,
      difficulty: difficulty === "all" ? undefined : difficulty,
      price: price === "all" ? undefined : price,
      search: search.trim() || undefined,
      type: eventType === "all" ? undefined : eventType,
    }),
    [beginnerFriendly, difficulty, eventType, price, search],
  );
  const eventsQuery = useEventsQuery(filters);
  const events = eventsQuery.data?.events ?? [];
  const total = eventsQuery.data?.pagination.total ?? events.length;
  const hasFilters =
    search.trim() ||
    eventType !== "all" ||
    difficulty !== "all" ||
    price !== "all" ||
    beginnerFriendly;

  return (
    <MobileScrollScreen subtitle="Community calendar" title="Events">
      <MobileSection
        description="Search by event name, site, or place. Filters use backend event contracts."
        title="Browse events"
      >
        <View className="gap-3">
          <TextInput
            className="min-h-11 rounded-2xl border border-border bg-card px-4 text-foreground"
            onChangeText={setSearch}
            placeholder="Search events"
            placeholderTextColor="#64748b"
            returnKeyType="search"
            value={search}
          />
          <View className="flex-row flex-wrap gap-2">
            {eventTypeFilters.map((option) => (
              <FilterChip
                active={eventType === option.value}
                key={option.value}
                label={option.label}
                onPress={() => setEventType(option.value)}
              />
            ))}
          </View>
          <View className="flex-row flex-wrap gap-2">
            {difficultyFilters.map((option) => (
              <FilterChip
                active={difficulty === option.value}
                key={option.value}
                label={option.label}
                onPress={() => setDifficulty(option.value)}
              />
            ))}
          </View>
          <View className="flex-row flex-wrap gap-2">
            {priceFilters.map((option) => (
              <FilterChip
                active={price === option.value}
                key={option.value}
                label={option.label}
                onPress={() => setPrice(option.value)}
              />
            ))}
            <FilterChip
              active={beginnerFriendly}
              label="Beginner friendly"
              onPress={() => setBeginnerFriendly((value) => !value)}
            />
          </View>
          {hasFilters ? (
            <MobileButton
              variant="ghost"
              onPress={() => {
                setBeginnerFriendly(false);
                setDifficulty("all");
                setEventType("all");
                setPrice("all");
                setSearch("");
              }}
            >
              Reset filters
            </MobileButton>
          ) : null}
        </View>
      </MobileSection>
      <MobileSection
        description={`${total} event${total === 1 ? "" : "s"} matched.`}
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
