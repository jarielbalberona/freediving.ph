import { Image, Pressable, Text, View } from "react-native";
import { Link } from "expo-router";
import type { Href } from "expo-router";
import type {
  CourseBookingPaymentStatus,
  CourseBookingStatus,
  CourseLevel,
  CourseType,
  PublicCourse,
  PublicCourseSession,
  PublicSchool,
} from "@freediving.ph/types";

import { SocialListRow, SocialMetadataLine, StatusPill } from "@/components/social";

export const safeSegment = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed &&
    !trimmed.includes("/") &&
    !trimmed.includes("?") &&
    !trimmed.includes("#")
    ? trimmed
    : undefined;
};

export const compactMarkdown = (value: string | undefined, fallback = "") =>
  (value ?? fallback)
    .replace(/[#*_>`-]/g, "")
    .replace(/\n{2,}/g, "\n")
    .trim();

export const moneyLabel = (amount: number | null, currency = "PHP") =>
  amount === null || amount === undefined
    ? "Price on request"
    : new Intl.NumberFormat("en-PH", {
        currency: currency || "PHP",
        style: "currency",
      }).format(amount);

export const courseTypeLabel = (type: CourseType | "") =>
  type
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Course";

export const levelLabel = (level: CourseLevel | "") =>
  level
    ? level
        .split("_")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    : "All levels";

export const statusLabel = (status: CourseBookingStatus) =>
  ({
    approved: "Approved",
    cancelled: "Cancelled",
    completed: "Completed",
    pending_review: "Pending review",
    rejected: "Rejected",
    reschedule_requested: "Reschedule requested",
    scheduled: "Scheduled",
  })[status] ?? status;

export const paymentStatusLabel = (status: CourseBookingPaymentStatus) =>
  ({
    not_required: "Not required",
    pending_upload: "Pending upload",
    rejected: "Rejected",
    submitted: "Submitted",
    verified: "Verified",
  })[status] ?? status;

export const formatDateTime = (value: string | undefined) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export function SchoolHero({ school }: { school: PublicSchool }) {
  return (
    <View className="overflow-hidden rounded-2xl border border-border bg-card">
      {school.coverUrl ? (
        <Image
          className="h-36 w-full bg-muted"
          resizeMode="cover"
          source={{ uri: school.coverUrl }}
        />
      ) : null}
      <View className="gap-3 p-4">
        <View className="flex-row items-center gap-3">
          {school.logoUrl ? (
            <Image
              className="h-16 w-16 rounded-2xl bg-muted"
              resizeMode="cover"
              source={{ uri: school.logoUrl }}
            />
          ) : null}
          <View className="flex-1 gap-1">
            <Text className="text-xl font-bold text-foreground">{school.name}</Text>
            <Text className="text-sm text-muted-foreground">
              {school.baseLocationLabel || school.baseLocation || school.cityName || "Philippines"}
            </Text>
          </View>
        </View>
        {school.shortDescription ? (
          <Text className="text-sm leading-5 text-muted-foreground">
            {school.shortDescription}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function SchoolCard({ school }: { school: PublicSchool }) {
  const slug = safeSegment(school.slug);
  const content = (
    <SocialListRow
      body={school.shortDescription || school.baseLocationLabel}
      meta={[
        school.baseLocationLabel || school.cityName || school.provinceName,
        `${school.publishedCourseCount} courses`,
      ]}
      name="School"
      status={<StatusPill>{school.publishedCourseCount} courses</StatusPill>}
      title={school.name}
    >
      <SocialMetadataLine values={[school.diveSiteName, school.diveSiteArea]} />
    </SocialListRow>
  );

  if (!slug) return content;
  return (
    <Link
      asChild
      href={
        {
          pathname: "/(app)/(tabs)/(home)/schools/[slug]",
          params: { slug },
        } as unknown as Href
      }
    >
      <Pressable accessibilityRole="link">{content}</Pressable>
    </Link>
  );
}

export function CourseCard({
  course,
  schoolSlug,
}: {
  course: PublicCourse;
  schoolSlug: string;
}) {
  const courseSlug = safeSegment(course.slug);
  const content = (
    <SocialListRow
      body={course.shortDescription}
      meta={[
        courseTypeLabel(course.courseType),
        levelLabel(course.level),
        moneyLabel(course.priceAmount, course.currency),
      ]}
      name="Course"
      status={<StatusPill>{course.upcomingSessionCount} schedules</StatusPill>}
      title={course.title}
    >
      <SocialMetadataLine
        values={[
          course.durationLabel,
          course.paymentRequired ? "Payment required" : "No payment required",
          course.approvalRequired ? "Approval required" : "Instant schedule when available",
        ]}
      />
    </SocialListRow>
  );

  if (!courseSlug) return content;
  return (
    <Link
      asChild
      href={
        {
          pathname: "/(app)/(tabs)/(home)/schools/[slug]/courses/[courseSlug]",
          params: { courseSlug, slug: schoolSlug },
        } as unknown as Href
      }
    >
      <Pressable accessibilityRole="link">{content}</Pressable>
    </Link>
  );
}

export function SessionRow({
  onPress,
  selected,
  session,
}: {
  onPress?: () => void;
  selected?: boolean;
  session: PublicCourseSession;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      className={`rounded-2xl border p-3 ${
        selected ? "border-primary bg-primary/10" : "border-border bg-card"
      } ${session.isFull ? "opacity-60" : ""}`}
      disabled={!onPress || session.isFull}
      onPress={onPress}
    >
      <View className="gap-1">
        <Text className="font-semibold text-foreground">{session.title}</Text>
        <Text className="text-sm text-muted-foreground">
          {formatDateTime(session.startsAt)}
        </Text>
        <Text className="text-sm text-muted-foreground">
          {session.locationLabel || session.formattedAddress || "Location TBA"}
        </Text>
        <Text className="text-xs text-muted-foreground">
          {session.isFull
            ? "Full"
            : session.slotsLeft === null
              ? "Open capacity"
              : `${session.slotsLeft} slots left`}
        </Text>
      </View>
    </Pressable>
  );
}
