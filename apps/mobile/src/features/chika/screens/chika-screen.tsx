import { Link } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
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
import { useChikaCategoriesQuery } from "@/features/chika/hooks/use-chika-categories-query";
import { useChikaThreadsQuery } from "@/features/chika/hooks/use-chika-threads-query";

export function ChikaScreen() {
  const { isLoaded, isSignedIn } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const categoriesQuery = useChikaCategoriesQuery();
  const threadsQuery = useChikaThreadsQuery(selectedCategory);
  const threads = threadsQuery.data?.items ?? [];
  const canPostChika = isLoaded && Boolean(isSignedIn);
  const categories = categoriesQuery.data?.items ?? [];
  const selectedCategoryName =
    categories.find((category) => category.slug === selectedCategory)?.name ??
    "Latest Chika";

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
        title={selectedCategoryName}
      >
        <View className="mb-4 gap-3">
          {categoriesQuery.isLoading ? (
            <MobileLoadingState message="Loading Chika categories." />
          ) : null}
          {categoriesQuery.error ? (
            <View className="gap-2">
              <Text className="text-sm text-muted-foreground">
                Categories are unavailable right now.
              </Text>
              <MobileButton
                variant="secondary"
                onPress={() => void categoriesQuery.refetch()}
              >
                Retry categories
              </MobileButton>
            </View>
          ) : null}
          {categories.length > 0 ? (
            <View className="flex-row flex-wrap gap-2">
              <MobileButton
                variant={!selectedCategory ? "primary" : "secondary"}
                onPress={() => setSelectedCategory(undefined)}
              >
                All
              </MobileButton>
              {categories.map((category) => (
                <MobileButton
                  key={category.id}
                  variant={
                    selectedCategory === category.slug ? "primary" : "secondary"
                  }
                  onPress={() => setSelectedCategory(category.slug)}
                >
                  {category.name}
                </MobileButton>
              ))}
            </View>
          ) : null}
        </View>

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
            description={
              selectedCategory
                ? "No threads in this category yet."
                : "No Chika threads yet."
            }
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
