import { View } from "react-native";

import {
  MobileEmptyState,
  MobileErrorState,
  MobileLoadingState,
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";
import { ChikaThreadCard } from "@/features/chika/components/chika-thread-card";
import { useChikaThreadsQuery } from "@/features/chika/hooks/use-chika-threads-query";

export function ChikaScreen() {
  const threadsQuery = useChikaThreadsQuery();
  const threads = threadsQuery.data?.items ?? [];

  return (
    <MobileScrollScreen subtitle="Community threads" title="Chika">
      <MobileSection
        description="Read the latest community conversations from divers around the Philippines."
        title="Latest Chika"
      >
        {threadsQuery.isLoading ? <MobileLoadingState message="Loading Chika." /> : null}

        {threadsQuery.error ? (
          <View className="gap-3">
            <MobileErrorState
              message="Chika is taking longer than expected to load."
              title="Chika is unavailable"
            />
            <MobileButton variant="secondary" onPress={() => void threadsQuery.refetch()}>
              Try again
            </MobileButton>
          </View>
        ) : null}

        {!threadsQuery.isLoading && !threadsQuery.error && threads.length === 0 ? (
          <MobileEmptyState
            description="Start conversations on the web while mobile posting is being prepared."
            title="No Chika threads yet"
          />
        ) : null}

        {!threadsQuery.isLoading && !threadsQuery.error && threads.length > 0 ? (
          <View className="gap-3">
            {threads.map((thread) => (
              <ChikaThreadCard key={thread.id} thread={thread} />
            ))}
          </View>
        ) : null}
      </MobileSection>
    </MobileScrollScreen>
  );
}
