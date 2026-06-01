import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { CourseType, PublicSchoolFilters } from "@freediving.ph/types";

import {
  MobileEmptyState,
  MobileErrorState,
  MobileLoadingState,
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";
import { SchoolCard } from "@/features/schools/components/school-ui";
import { usePublicSchoolsQuery } from "@/features/schools/hooks/use-schools-query";

type CourseTypeFilter = CourseType | "all";

const courseTypeFilters: Array<{ label: string; value: CourseTypeFilter }> = [
  { label: "All", value: "all" },
  { label: "Intro", value: "intro" },
  { label: "Pool", value: "pool_training" },
  { label: "Line", value: "line_training" },
  { label: "Depth", value: "depth_training" },
  { label: "Certification", value: "certification" },
  { label: "Coaching", value: "coaching" },
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

export function SchoolsScreen() {
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [courseType, setCourseType] = useState<CourseTypeFilter>("all");
  const filters = useMemo<PublicSchoolFilters>(
    () => ({
      courseType: courseType === "all" ? undefined : courseType,
      location: location.trim() || undefined,
      search: search.trim() || undefined,
    }),
    [courseType, location, search],
  );
  const schoolsQuery = usePublicSchoolsQuery(filters);
  const schools = schoolsQuery.data ?? [];
  const hasFilters = search.trim() || location.trim() || courseType !== "all";

  return (
    <MobileScrollScreen subtitle="Schools and courses" title="Schools">
      <MobileSection
        description="Browse published schools using the same public contracts as web."
        title="Find a school"
      >
        <View className="gap-3">
          <TextInput
            className="min-h-11 rounded-2xl border border-border bg-card px-4 text-foreground"
            onChangeText={setSearch}
            placeholder="Search schools"
            placeholderTextColor="#64748b"
            returnKeyType="search"
            value={search}
          />
          <TextInput
            className="min-h-11 rounded-2xl border border-border bg-card px-4 text-foreground"
            onChangeText={setLocation}
            placeholder="Location"
            placeholderTextColor="#64748b"
            returnKeyType="search"
            value={location}
          />
          <View className="flex-row flex-wrap gap-2">
            {courseTypeFilters.map((option) => (
              <FilterChip
                active={courseType === option.value}
                key={option.value}
                label={option.label}
                onPress={() => setCourseType(option.value)}
              />
            ))}
          </View>
          <View className="flex-row flex-wrap gap-2">
            <MobileButton
              variant="secondary"
              onPress={() => router.push("/(app)/(tabs)/(home)/schools/bookings")}
            >
              My bookings
            </MobileButton>
            {hasFilters ? (
              <MobileButton
                variant="ghost"
                onPress={() => {
                  setCourseType("all");
                  setLocation("");
                  setSearch("");
                }}
              >
                Reset filters
              </MobileButton>
            ) : null}
          </View>
        </View>
      </MobileSection>

      <MobileSection
        description={`${schools.length} school${schools.length === 1 ? "" : "s"} matched.`}
        title="Published schools"
      >
        {schoolsQuery.isLoading ? <MobileLoadingState message="Loading schools." /> : null}
        {schoolsQuery.error ? (
          <View className="gap-3">
            <MobileErrorState
              message="Schools are taking longer than expected to load."
              title="Schools are unavailable"
            />
            <MobileButton variant="secondary" onPress={() => void schoolsQuery.refetch()}>
              Try again
            </MobileButton>
          </View>
        ) : null}
        {!schoolsQuery.isLoading && !schoolsQuery.error && schools.length === 0 ? (
          <MobileEmptyState
            description="No published schools match these filters."
            title="No schools found"
          />
        ) : null}
        {!schoolsQuery.isLoading && !schoolsQuery.error && schools.length > 0 ? (
          <View className="gap-3">
            {schools.map((school) => (
              <SchoolCard key={school.id} school={school} />
            ))}
          </View>
        ) : null}
      </MobileSection>
    </MobileScrollScreen>
  );
}
