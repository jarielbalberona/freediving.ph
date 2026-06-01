import { router, useLocalSearchParams } from "expo-router";
import { Pressable, Text, TextInput, View } from "react-native";
import { useMemo, useState } from "react";
import type { CourseLevel, CourseType, PublicCourseFilters } from "@freediving.ph/types";

import {
  MobileEmptyState,
  MobileErrorState,
  MobileLoadingState,
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";
import {
  CourseCard,
  SchoolHero,
  compactMarkdown,
  safeSegment,
} from "@/features/schools/components/school-ui";
import {
  usePublicCoursesQuery,
  usePublicSchoolQuery,
} from "@/features/schools/hooks/use-schools-query";

type CourseTypeFilter = CourseType | "all";
type LevelFilter = CourseLevel | "all";
type PaymentFilter = "all" | "free" | "paid";

const typeOptions: Array<{ label: string; value: CourseTypeFilter }> = [
  { label: "All", value: "all" },
  { label: "Intro", value: "intro" },
  { label: "Certification", value: "certification" },
  { label: "Coaching", value: "coaching" },
  { label: "Workshop", value: "workshop" },
];

const levelOptions: Array<{ label: string; value: LevelFilter }> = [
  { label: "Any level", value: "all" },
  { label: "Beginner", value: "beginner" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Advanced", value: "advanced" },
  { label: "All levels", value: "all_levels" },
];

function Chip({
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

export function SchoolDetailScreen() {
  const params = useLocalSearchParams<{ slug?: string }>();
  const slug = safeSegment(Array.isArray(params.slug) ? params.slug[0] : params.slug);
  const [search, setSearch] = useState("");
  const [courseType, setCourseType] = useState<CourseTypeFilter>("all");
  const [level, setLevel] = useState<LevelFilter>("all");
  const [payment, setPayment] = useState<PaymentFilter>("all");
  const schoolQuery = usePublicSchoolQuery(slug);
  const filters = useMemo<PublicCourseFilters>(
    () => ({
      courseType: courseType === "all" ? undefined : courseType,
      level: level === "all" ? undefined : level,
      payment: payment === "all" ? undefined : payment,
      search: search.trim() || undefined,
    }),
    [courseType, level, payment, search],
  );
  const coursesQuery = usePublicCoursesQuery(slug, filters);
  const school = schoolQuery.data ?? coursesQuery.data?.school;
  const courses = coursesQuery.data?.courses ?? [];
  const hasFilters =
    search.trim() || courseType !== "all" || level !== "all" || payment !== "all";

  return (
    <MobileScrollScreen subtitle="School profile" title={school?.name ?? "School"}>
      {!slug ? (
        <MobileErrorState message="The school link is invalid." title="School unavailable" />
      ) : null}

      {schoolQuery.isLoading ? <MobileLoadingState message="Loading school." /> : null}
      {schoolQuery.error ? (
        <MobileErrorState
          message="This school could not be loaded."
          title="School unavailable"
        />
      ) : null}

      {school ? (
        <>
          <MobileSection title="School">
            <SchoolHero school={school} />
          </MobileSection>

          <MobileSection title="Profile">
            <View className="gap-3 rounded-2xl border border-border bg-card p-4">
              <Text className="text-sm leading-5 text-muted-foreground">
                {compactMarkdown(
                  school.descriptionMarkdown,
                  school.shortDescription || "No public description yet.",
                )}
              </Text>
              <Text className="text-sm text-muted-foreground">
                {school.formattedAddress ||
                  school.baseLocationLabel ||
                  school.baseLocation ||
                  "Location TBA"}
              </Text>
              {school.diveSiteName ? (
                <Text className="text-sm text-muted-foreground">
                  Home site: {school.diveSiteName}
                </Text>
              ) : null}
              {school.paymentMethods?.length ? (
                <Text className="text-sm text-muted-foreground">
                  Payment instructions are available on paid course booking forms.
                </Text>
              ) : null}
            </View>
          </MobileSection>

          <MobileSection title="Courses">
            <View className="mb-4 gap-3">
              <TextInput
                className="min-h-11 rounded-2xl border border-border bg-card px-4 text-foreground"
                onChangeText={setSearch}
                placeholder="Search courses"
                placeholderTextColor="#64748b"
                returnKeyType="search"
                value={search}
              />
              <View className="flex-row flex-wrap gap-2">
                {typeOptions.map((option) => (
                  <Chip
                    active={courseType === option.value}
                    key={option.value}
                    label={option.label}
                    onPress={() => setCourseType(option.value)}
                  />
                ))}
              </View>
              <View className="flex-row flex-wrap gap-2">
                {levelOptions.map((option) => (
                  <Chip
                    active={level === option.value}
                    key={option.value}
                    label={option.label}
                    onPress={() => setLevel(option.value)}
                  />
                ))}
                {(["all", "free", "paid"] as const).map((option) => (
                  <Chip
                    active={payment === option}
                    key={option}
                    label={option === "all" ? "Any price" : option === "free" ? "Free" : "Paid"}
                    onPress={() => setPayment(option)}
                  />
                ))}
              </View>
              {hasFilters ? (
                <MobileButton
                  variant="ghost"
                  onPress={() => {
                    setCourseType("all");
                    setLevel("all");
                    setPayment("all");
                    setSearch("");
                  }}
                >
                  Reset filters
                </MobileButton>
              ) : null}
            </View>

            {coursesQuery.isLoading ? <MobileLoadingState message="Loading courses." /> : null}
            {coursesQuery.error ? (
              <MobileErrorState
                message="Courses are taking longer than expected to load."
                title="Courses unavailable"
              />
            ) : null}
            {!coursesQuery.isLoading && !coursesQuery.error && courses.length === 0 ? (
              <MobileEmptyState
                description="No published courses match these filters."
                title="No courses found"
              />
            ) : null}
            {!coursesQuery.isLoading && !coursesQuery.error && courses.length > 0 ? (
              <View className="gap-3">
                {courses.map((course) => (
                  <CourseCard course={course} key={course.id} schoolSlug={slug ?? ""} />
                ))}
              </View>
            ) : null}
          </MobileSection>

          {school.publishedCourseCount > 0 ? (
            <MobileSection title="Your bookings">
              <MobileButton
                variant="secondary"
                onPress={() => router.push("/(app)/(tabs)/(home)/schools/bookings")}
              >
                Open my bookings
              </MobileButton>
            </MobileSection>
          ) : null}
        </>
      ) : null}
    </MobileScrollScreen>
  );
}
