import { Link } from "expo-router";
import { View } from "react-native";
import { useAuth } from "@clerk/expo";

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
  const { isLoaded, isSignedIn } = useAuth();
  const threadsQuery = useChikaThreadsQuery();
  const threads = threadsQuery.data?.items ?? [];
  const canPostChika = isLoaded && Boolean(isSignedIn);

  return (
    <MobileScrollScreen subtitle="Community threads" title="Chika">
      <MobileSection
        description="Start a new Chika thread for questions, trip reports, tips, and community updates."
        title="Share with Chika"
      >
        {canPostChika ? (
          <Link href="/(app)/(tabs)/chika/post" asChild>
            <MobileButton>Post Chika</MobileButton>
          </Link>
        ) : (
          <Link href="/sign-in" asChild>
            <MobileButton variant="secondary">
              {isLoaded ? "Sign in to post Chika" : "Checking your session"}
            </MobileButton>
          </Link>
        )}
      </MobileSection>

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
