import type {
  ProfileBadgesResponse,
  ProfileDiveMapResponse,
  ProfileDiveMemoriesResponse,
  ProfileJourneyResponse,
  ProfilePassportResponse,
} from "@freediving.ph/types";
import { Text, View } from "react-native";

import { MobileCard, MobileErrorState, MobileLoadingState } from "@/components/shell";

type SummaryMetric = {
  label: string;
  value: string | number;
};

const formatCount = (value: number | undefined) =>
  new Intl.NumberFormat().format(value ?? 0);

function MetricRow({ items }: { items: SummaryMetric[] }) {
  return (
    <View className="flex-row flex-wrap gap-3">
      {items.map((item) => (
        <View key={item.label} className="min-w-20">
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

export function ProfileDiveIdentitySummary({
  badges,
  diveMap,
  memories,
  passport,
  journey,
  isLoading,
  hasError,
}: {
  badges?: ProfileBadgesResponse;
  diveMap?: ProfileDiveMapResponse;
  memories?: ProfileDiveMemoriesResponse;
  passport?: ProfilePassportResponse;
  journey?: ProfileJourneyResponse;
  isLoading: boolean;
  hasError: boolean;
}) {
  if (isLoading && !passport && !diveMap && !badges) {
    return <MobileLoadingState message="Loading dive identity." />;
  }

  if (hasError && !passport && !diveMap && !badges) {
    return (
      <MobileErrorState
        message="Dive identity summaries are unavailable right now."
        title="Dive identity unavailable"
      />
    );
  }

  const passportStats = passport?.passport.stats;
  const badgeCount =
    passportStats?.badgeCount ??
    ((badges?.badges.length ?? 0) + (badges?.autoStats.length ?? 0));
  const visitedSiteCount =
    passportStats?.visitedSiteCount ?? diveMap?.visitedSiteCount ?? 0;
  const journeyCount =
    passportStats?.journeyEntryCount ?? journey?.items.length ?? 0;
  const memoryCount = passportStats?.memoryCount ?? memories?.items.length ?? 0;
  const proofSites = diveMap?.markers.slice(0, 3) ?? passport?.passport.mapPreview.markers.slice(0, 3) ?? [];
  const latestJourney = passport?.passport.journeyHighlights.entries[0] ?? journey?.items[0];
  const latestMemory = passport?.passport.memories.items[0] ?? memories?.items[0];

  return (
    <MobileCard>
      <View className="gap-3">
        <View>
          <Text className="text-base font-semibold text-foreground">
            Dive identity
          </Text>
          <Text className="mt-1 text-sm leading-5 text-muted-foreground">
            Proof-backed sites come from the diver's own qualifying media posts.
            Memories stay contextual and do not unlock locations.
          </Text>
        </View>
        <MetricRow
          items={[
            { label: "Sites", value: formatCount(visitedSiteCount) },
            { label: "Badges", value: formatCount(badgeCount) },
            { label: "Journey", value: formatCount(journeyCount) },
            { label: "Memories", value: formatCount(memoryCount) },
          ]}
        />
        {proofSites.length > 0 ? (
          <View className="gap-1">
            <Text className="text-xs font-semibold uppercase text-muted-foreground">
              Recent proof-backed sites
            </Text>
            {proofSites.map((site) => (
              <Text key={site.diveSiteId} className="text-sm text-foreground">
                {site.diveSiteName}
              </Text>
            ))}
          </View>
        ) : null}
        {latestJourney ? (
          <Text className="text-sm text-muted-foreground" numberOfLines={2}>
            Journey: {latestJourney.title}
          </Text>
        ) : null}
        {latestMemory ? (
          <Text className="text-sm text-muted-foreground" numberOfLines={2}>
            Memory: {latestMemory.title}
          </Text>
        ) : null}
      </View>
    </MobileCard>
  );
}
