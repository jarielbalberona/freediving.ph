import Ionicons from "@expo/vector-icons/Ionicons";
import type {
  JourneyEntry,
  PassportSectionState,
  ProfileDiveMapMarker,
  ProfileDiveMapResponse,
  ProfileJourneyResponse,
  ProfilePassport,
  ProfilePassportResponse,
} from "@freediving.ph/types";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import {
  MobileEmptyState,
  MobileErrorState,
  MobileLoadingState,
} from "@/components/shell";
import { ProfileDetailRow } from "@/features/profiles/components/profile-detail-row";

const formatShortDate = (value: string | undefined) => {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

const sectionStateLabel = (state: PassportSectionState, emptyLabel: string) => {
  if (state.status === "hidden") return "Hidden on this passport.";
  if (state.status === "unavailable") return "Not available right now.";
  return emptyLabel;
};

function MetricGrid({
  items,
}: {
  items: Array<{ label: string; value: number | string }>;
}) {
  return (
    <View className="flex-row flex-wrap gap-3">
      {items.map((item) => (
        <View key={item.label} className="min-w-20 rounded-2xl bg-secondary px-3 py-2">
          <Text className="text-base font-semibold text-foreground">
            {item.value}
          </Text>
          <Text className="text-xs uppercase text-muted-foreground">
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function DiveMapMarkerRow({ marker }: { marker: ProfileDiveMapMarker }) {
  return (
    <Link
      href={{
        pathname: "/(app)/(tabs)/(home)/explore/[slug]",
        params: { slug: marker.diveSiteSlug },
      }}
      asChild
    >
      <Pressable accessibilityRole="link">
        <View className="rounded-2xl border border-border bg-card p-3">
          <View className="flex-row items-start justify-between gap-3">
            <View className="min-w-0 flex-1">
              <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                {marker.diveSiteName}
              </Text>
              <Text className="mt-1 text-xs text-muted-foreground" numberOfLines={1}>
                {marker.diveSiteArea}
              </Text>
            </View>
            <View className="rounded-full bg-secondary px-2 py-1">
              <Text className="text-xs font-semibold text-foreground">
                {marker.mediaPostCount}
              </Text>
            </View>
          </View>
          <Text className="mt-3 text-xs text-muted-foreground">
            Last proof {formatShortDate(marker.lastVisitedAt)}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}

export function ProfileDiveMapSection({
  data,
  error,
  isLoading,
  isOwner,
}: {
  data?: ProfileDiveMapResponse;
  error?: unknown;
  isLoading: boolean;
  isOwner: boolean;
}) {
  if (isLoading && !data) {
    return <MobileLoadingState message="Loading Dive Map." />;
  }

  if (error && !data) {
    return (
      <MobileErrorState
        message="The visible proof-backed dive sites for this profile are unavailable right now."
        title="Dive Map unavailable"
      />
    );
  }

  const markers = data?.markers ?? [];
  if (markers.length === 0) {
    return (
      <MobileEmptyState
        description={
          isOwner
            ? "Post media tagged to dive sites to unlock proof-backed locations."
            : "Visible proof-backed dive sites will appear here."
        }
        title={isOwner ? "No proof-backed dive sites yet" : "No visible Dive Map sites yet"}
      />
    );
  }

  return (
    <View className="gap-3">
      <MetricGrid
        items={[
          { label: "Sites", value: data?.visitedSiteCount ?? markers.length },
          {
            label: "Proof posts",
            value: markers.reduce((total, marker) => total + marker.mediaPostCount, 0),
          },
        ]}
      />
      {markers.map((marker) => (
        <DiveMapMarkerRow key={marker.diveSiteId} marker={marker} />
      ))}
      <Text className="text-xs leading-5 text-muted-foreground">
        Dive Map locations are unlocked only by this diver's own qualifying
        media posts tagged to a dive site.
      </Text>
    </View>
  );
}

function JourneyEntryRow({ item }: { item: JourneyEntry }) {
  return (
    <View className="rounded-2xl border border-border bg-card p-3">
      <View className="flex-row items-start gap-3">
        <View className="mt-0.5 rounded-full bg-secondary p-2">
          <Ionicons color="#0A1F2E" name="git-branch-outline" size={16} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-sm font-semibold text-foreground" numberOfLines={2}>
            {item.title}
          </Text>
          {item.body ? (
            <Text className="mt-1 text-sm leading-5 text-muted-foreground" numberOfLines={3}>
              {item.body}
            </Text>
          ) : null}
          <Text className="mt-2 text-xs text-muted-foreground">
            {formatShortDate(item.occurredAt)} · {item.visibility}
            {item.mediaIds.length > 0 ? ` · ${item.mediaIds.length} media` : ""}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function ProfileJourneySection({
  data,
  error,
  isLoading,
  isOwner,
}: {
  data?: ProfileJourneyResponse;
  error?: unknown;
  isLoading: boolean;
  isOwner: boolean;
}) {
  if (isLoading && !data) {
    return <MobileLoadingState message="Loading Dive Journey." />;
  }

  if (error && !data) {
    return (
      <MobileErrorState
        message="The visible dive journey for this profile is unavailable right now."
        title="Dive Journey unavailable"
      />
    );
  }

  const items = data?.items ?? [];
  if (items.length === 0) {
    return (
      <MobileEmptyState
        description={
          isOwner
            ? "Journey entries will appear after you add notes or source systems generate milestones."
            : "Visible journey entries will appear here."
        }
        title={isOwner ? "No journey entries yet" : "No visible journey yet"}
      />
    );
  }

  return (
    <View className="gap-3">
      <MetricGrid items={[{ label: "Entries", value: items.length }]} />
      {items.map((item) => (
        <JourneyEntryRow key={item.id} item={item} />
      ))}
    </View>
  );
}

function PassportCard({
  children,
  icon,
  title,
}: {
  children: React.ReactNode;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
}) {
  return (
    <View className="rounded-2xl border border-border bg-card p-3">
      <View className="mb-2 flex-row items-center gap-2">
        <Ionicons color="#64748b" name={icon} size={16} />
        <Text className="text-sm font-semibold text-foreground">{title}</Text>
      </View>
      {children}
    </View>
  );
}

function PassportSectionList({
  emptyLabel,
  items,
  state,
}: {
  emptyLabel: string;
  items: string[];
  state: PassportSectionState;
}) {
  if (state.status !== "ready" || items.length === 0) {
    return (
      <Text className="text-sm text-muted-foreground">
        {sectionStateLabel(state, emptyLabel)}
      </Text>
    );
  }

  return (
    <View className="gap-1">
      {items.map((item) => (
        <Text key={item} className="text-sm text-foreground" numberOfLines={1}>
          {item}
        </Text>
      ))}
    </View>
  );
}

function PassportContent({ passport }: { passport: ProfilePassport }) {
  return (
    <View className="gap-3">
      <MetricGrid
        items={[
          { label: "Sites", value: passport.stats.visitedSiteCount },
          { label: "Badges", value: passport.stats.badgeCount },
          { label: "Journey", value: passport.stats.journeyEntryCount },
          { label: "Media", value: passport.stats.mediaPostCount },
          { label: "Memories", value: passport.stats.memoryCount },
        ]}
      />
      <PassportCard icon="map-outline" title="Dive Map">
        <PassportSectionList
          emptyLabel="No visited sites yet."
          items={passport.mapPreview.markers
            .slice(0, 4)
            .map((marker) => marker.diveSiteName)}
          state={passport.mapPreview.state}
        />
      </PassportCard>
      <PassportCard icon="ribbon-outline" title="Badges">
        <PassportSectionList
          emptyLabel="No badges yet."
          items={passport.badgeShowcase.badges
            .slice(0, 4)
            .map((badge) => badge.name)}
          state={passport.badgeShowcase.state}
        />
      </PassportCard>
      <PassportCard icon="git-branch-outline" title="Journey">
        <PassportSectionList
          emptyLabel="No journey highlights yet."
          items={passport.journeyHighlights.entries
            .slice(0, 4)
            .map((entry) => entry.title)}
          state={passport.journeyHighlights.state}
        />
      </PassportCard>
      <PassportCard icon="images-outline" title="Media">
        <ProfileDetailRow
          label="Recent media"
          value={
            passport.recentMedia.state.status === "ready"
              ? `${passport.recentMedia.items.length}`
              : sectionStateLabel(passport.recentMedia.state, "No recent media yet.")
          }
        />
      </PassportCard>
      <PassportCard icon="compass-outline" title="Memories">
        <PassportSectionList
          emptyLabel="No memories yet."
          items={passport.memories.items.slice(0, 4).map((memory) => memory.title)}
          state={passport.memories.state}
        />
      </PassportCard>
    </View>
  );
}

export function ProfilePassportSection({
  data,
  error,
  isLoading,
}: {
  data?: ProfilePassportResponse;
  error?: unknown;
  isLoading: boolean;
}) {
  if (isLoading && !data?.passport) {
    return <MobileLoadingState message="Loading Dive Passport." />;
  }

  if (error && !data?.passport) {
    return (
      <MobileErrorState
        message="The passport aggregate for this profile is unavailable right now."
        title="Dive Passport unavailable"
      />
    );
  }

  if (!data?.passport) {
    return (
      <MobileEmptyState
        description="Passport sections will appear after profile source systems have visible data."
        title="No Dive Passport yet"
      />
    );
  }

  return <PassportContent passport={data.passport} />;
}
