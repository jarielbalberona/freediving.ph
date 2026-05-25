import { View } from "react-native";

import {
  MobileEmptyState,
  MobileErrorState,
  MobileLoadingState,
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";
import { ExploreSiteCard } from "@/features/explore/components/explore-site-card";
import { useExploreSitesQuery } from "@/features/explore/hooks/use-explore-sites-query";

export function ExploreScreen() {
  const sitesQuery = useExploreSitesQuery();
  const sites = sitesQuery.data?.items ?? [];

  return (
    <MobileScrollScreen subtitle="Dive spots" title="Explore">
      <MobileSection
        description="Browse community-shared places to dive across the Philippines."
        title="Dive spots"
      >
        {sitesQuery.isLoading ? <MobileLoadingState message="Loading dive spots." /> : null}

        {sitesQuery.error ? (
          <View className="gap-3">
            <MobileErrorState
              message="Dive spots are taking longer than expected to load."
              title="Explore is unavailable"
            />
            <MobileButton variant="secondary" onPress={() => void sitesQuery.refetch()}>
              Try again
            </MobileButton>
          </View>
        ) : null}

        {!sitesQuery.isLoading && !sitesQuery.error && sites.length === 0 ? (
          <MobileEmptyState
            description="Explore will grow as the community adds more places to dive."
            title="No dive spots to show yet"
          />
        ) : null}

        {!sitesQuery.isLoading && !sitesQuery.error && sites.length > 0 ? (
          <View className="gap-3">
            {sites.map((site) => (
              <ExploreSiteCard key={site.id} site={site} />
            ))}
          </View>
        ) : null}
      </MobileSection>
    </MobileScrollScreen>
  );
}
