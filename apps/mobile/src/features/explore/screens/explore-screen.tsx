import { useState } from "react";
import { Text, TextInput, View } from "react-native";

import {
  MobileEmptyState,
  MobileErrorState,
  MobileLoadingState,
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";
import { ExploreSiteCard } from "@/features/explore/components/explore-site-card";
import {
  useExploreSiteLikeMutation,
  useExploreSiteSaveMutation,
  useSubmitExploreSiteMutation,
} from "@/features/explore/hooks/use-explore-mutations";
import { useExploreSitesQuery } from "@/features/explore/hooks/use-explore-sites-query";
import { useMyExploreSubmissionsQuery } from "@/features/explore/hooks/use-my-explore-submissions-query";
import { useOutbox } from "@/local/outbox/use-outbox";
import { PendingSyncPanel } from "@/local/sync/pending-sync-panel";

export function ExploreScreen() {
  const sitesQuery = useExploreSitesQuery();
  const submissionsQuery = useMyExploreSubmissionsQuery();
  const submitSite = useSubmitExploreSiteMutation();
  const likeSite = useExploreSiteLikeMutation();
  const saveSite = useExploreSiteSaveMutation();
  const outbox = useOutbox();
  const [showSubmit, setShowSubmit] = useState(false);
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [description, setDescription] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const sites = sitesQuery.data?.items ?? [];
  const submissions = submissionsQuery.data?.items ?? [];

  return (
    <MobileScrollScreen subtitle="Dive spots" title="Explore">
      <MobileSection
        description="Browse dive spots, save favorites, send a new spot, and check your submissions. Map view is coming later."
        title="Dive spot tools"
      >
        <View className="gap-3">
          <PendingSyncPanel
            isSyncing={outbox.isSyncing}
            items={outbox.items}
            message={outbox.message}
            onDiscard={outbox.discard}
            onSyncNow={outbox.syncNow}
          />
          <MobileButton variant="secondary" onPress={() => setShowSubmit((value) => !value)}>
            {showSubmit ? "Hide submit form" : "Submit a site"}
          </MobileButton>
          {showSubmit ? (
            <View className="gap-3">
              <TextInput
                className="rounded-2xl border border-border bg-card p-3 text-foreground"
                onChangeText={setName}
                placeholder="Site name"
                placeholderTextColor="#64748b"
                value={name}
              />
              <TextInput
                className="rounded-2xl border border-border bg-card p-3 text-foreground"
                onChangeText={setArea}
                placeholder="Area"
                placeholderTextColor="#64748b"
                value={area}
              />
              <View className="flex-row gap-2">
                <TextInput
                  className="flex-1 rounded-2xl border border-border bg-card p-3 text-foreground"
                  keyboardType="decimal-pad"
                  onChangeText={setLat}
                  placeholder="Latitude"
                  placeholderTextColor="#64748b"
                  value={lat}
                />
                <TextInput
                  className="flex-1 rounded-2xl border border-border bg-card p-3 text-foreground"
                  keyboardType="decimal-pad"
                  onChangeText={setLng}
                  placeholder="Longitude"
                  placeholderTextColor="#64748b"
                  value={lng}
                />
              </View>
              <TextInput
                className="min-h-24 rounded-2xl border border-border bg-card p-3 text-foreground"
                multiline
                onChangeText={setDescription}
                placeholder="Description"
                placeholderTextColor="#64748b"
                value={description}
              />
              <MobileButton
                disabled={
                  submitSite.isPending ||
                  name.trim().length < 2 ||
                  description.trim().length < 5 ||
                  Number.isNaN(Number(lat)) ||
                  Number.isNaN(Number(lng))
                }
                onPress={() => {
                  submitSite.mutate(
                    {
                      area: area.trim() || undefined,
                      description: description.trim(),
                      entryDifficulty: "moderate",
                      lat: Number(lat),
                      lng: Number(lng),
                      name: name.trim(),
                    },
                    {
                      onSuccess: () => {
                        setName("");
                        setArea("");
                        setDescription("");
                        setLat("");
                        setLng("");
                        setShowSubmit(false);
                      },
                    },
                  );
                }}
              >
                Submit for review
              </MobileButton>
            </View>
          ) : null}

          {submissions.length > 0 ? (
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">My submissions</Text>
              {submissions.map((submission) => (
                <Text key={submission.id} className="text-sm text-muted-foreground">
                  {submission.name} · {submission.moderationState}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      </MobileSection>

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
              <ExploreSiteCard
                key={site.id}
                site={site}
                onLike={(item) =>
                  likeSite.mutate(
                    {
                      siteId: item.id,
                      viewerHasLiked: item.viewerHasLiked,
                    },
                    {
                      onError: () =>
                        void outbox.enqueue({
                          entityId: item.id,
                          entityType: "explore_site",
                          operationType: "explore_site_like",
                          payload: {
                            siteId: item.id,
                            viewerHasLiked: item.viewerHasLiked,
                          },
                        }),
                    },
                  )
                }
                onSave={(item) =>
                  saveSite.mutate(
                    { isSaved: item.isSaved, siteId: item.id },
                    {
                      onError: () =>
                        void outbox.enqueue({
                          entityId: item.id,
                          entityType: "explore_site",
                          operationType: "explore_site_save",
                          payload: { isSaved: item.isSaved, siteId: item.id },
                        }),
                    },
                  )
                }
              />
            ))}
          </View>
        ) : null}
      </MobileSection>
    </MobileScrollScreen>
  );
}
