import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useAuth } from "@clerk/expo";
import type { CreateExploreSiteSubmissionRequest } from "@freediving.ph/types";

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
import { FphgoApiError, isAuthErrorStatus } from "@/lib/api/fphgo-client";
import { useOutbox } from "@/local/outbox/use-outbox";
import { PendingSyncPanel } from "@/local/sync/pending-sync-panel";

const SUBMISSION_LIMITS = {
  access: 500,
  area: 120,
  bestSeason: 160,
  descriptionMax: 2000,
  descriptionMin: 12,
  depthMax: 2000,
  hazard: 60,
  nameMax: 120,
  nameMin: 3,
  typicalConditions: 500,
};

const parseOptionalNumber = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const parseHazards = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const optionalText = (value: string) => value.trim() || undefined;

const firstServerError = (error: unknown, fallback: string) => {
  if (error instanceof FphgoApiError) {
    return error.apiError?.issues?.[0]?.message || error.apiError?.message || fallback;
  }
  return fallback;
};

type SubmissionFormState = {
  access: string;
  area: string;
  bestSeason: string;
  depthMaxM: string;
  depthMinM: string;
  description: string;
  entryDifficulty: CreateExploreSiteSubmissionRequest["entryDifficulty"];
  fees: string;
  hazards: string;
  lat: string;
  lng: string;
  name: string;
  typicalConditions: string;
};

const initialForm: SubmissionFormState = {
  access: "",
  area: "",
  bestSeason: "",
  depthMaxM: "",
  depthMinM: "",
  description: "",
  entryDifficulty: "moderate",
  fees: "",
  hazards: "",
  lat: "",
  lng: "",
  name: "",
  typicalConditions: "",
};

const validateSubmission = (form: SubmissionFormState) => {
  const name = form.name.trim();
  const description = form.description.trim();
  const lat = Number(form.lat);
  const lng = Number(form.lng);
  const depthMinM = parseOptionalNumber(form.depthMinM);
  const depthMaxM = parseOptionalNumber(form.depthMaxM);
  const hazards = parseHazards(form.hazards);

  if (name.length < SUBMISSION_LIMITS.nameMin) {
    return { error: "Site name must be at least 3 characters." };
  }
  if (name.length > SUBMISSION_LIMITS.nameMax) {
    return { error: "Site name is too long." };
  }
  if (description.length < SUBMISSION_LIMITS.descriptionMin) {
    return { error: "Description must be at least 12 characters." };
  }
  if (description.length > SUBMISSION_LIMITS.descriptionMax) {
    return { error: "Description is too long." };
  }
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return { error: "Latitude must be between -90 and 90." };
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    return { error: "Longitude must be between -180 and 180." };
  }
  if (form.area.trim().length > SUBMISSION_LIMITS.area) {
    return { error: "Area is too long." };
  }
  if (
    (depthMinM !== undefined &&
      (!Number.isFinite(depthMinM) ||
        depthMinM < 0 ||
        depthMinM > SUBMISSION_LIMITS.depthMax)) ||
    (depthMaxM !== undefined &&
      (!Number.isFinite(depthMaxM) ||
        depthMaxM < 0 ||
        depthMaxM > SUBMISSION_LIMITS.depthMax))
  ) {
    return { error: "Depth must be between 0 and 2000 meters." };
  }
  if (
    typeof depthMinM === "number" &&
    Number.isFinite(depthMinM) &&
    typeof depthMaxM === "number" &&
    Number.isFinite(depthMaxM) &&
    depthMinM > depthMaxM
  ) {
    return { error: "Minimum depth must be less than or equal to maximum depth." };
  }
  if (hazards.some((hazard) => hazard.length > SUBMISSION_LIMITS.hazard)) {
    return { error: "Each hazard must be at most 60 characters." };
  }

  return {
    payload: {
      access: optionalText(form.access),
      area: optionalText(form.area),
      bestSeason: optionalText(form.bestSeason),
      depthMaxM,
      depthMinM,
      description,
      entryDifficulty: form.entryDifficulty,
      fees: optionalText(form.fees),
      hazards,
      lat,
      lng,
      name,
      typicalConditions: optionalText(form.typicalConditions),
    } satisfies CreateExploreSiteSubmissionRequest,
  };
};

export function ExploreScreen() {
  const sitesQuery = useExploreSitesQuery();
  const submissionsQuery = useMyExploreSubmissionsQuery();
  const submitSite = useSubmitExploreSiteMutation();
  const likeSite = useExploreSiteLikeMutation();
  const saveSite = useExploreSiteSaveMutation();
  const outbox = useOutbox();
  const { isLoaded, isSignedIn } = useAuth();
  const [showSubmit, setShowSubmit] = useState(false);
  const [form, setForm] = useState<SubmissionFormState>(initialForm);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const sites = sitesQuery.data?.items ?? [];
  const submissions = submissionsQuery.data?.items ?? [];
  const canUseMemberActions = isLoaded && Boolean(isSignedIn);

  const updateForm = <Key extends keyof SubmissionFormState>(
    key: Key,
    value: SubmissionFormState[Key],
  ) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <MobileScrollScreen subtitle="Dive spots" title="Explore">
      <MobileSection
        description="Browse dive spots, save favorites, send a new spot, and check your submissions."
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
          {actionMessage ? (
            <Text className="text-sm text-muted-foreground">{actionMessage}</Text>
          ) : null}
          {!canUseMemberActions ? (
            <Text className="text-sm text-muted-foreground">
              Sign in to save spots, like spots, submit a site, or view your submissions.
            </Text>
          ) : null}
          <MobileButton variant="secondary" onPress={() => setShowSubmit((value) => !value)}>
            {showSubmit ? "Hide submit form" : "Submit a site"}
          </MobileButton>
          {showSubmit ? (
            <View className="gap-3">
              {formMessage ? (
                <Text className="text-sm text-muted-foreground">{formMessage}</Text>
              ) : null}
              <TextInput
                className="rounded-2xl border border-border bg-card p-3 text-foreground"
                maxLength={SUBMISSION_LIMITS.nameMax}
                onChangeText={(value) => updateForm("name", value)}
                placeholder="Site name"
                placeholderTextColor="#64748b"
                value={form.name}
              />
              <TextInput
                className="rounded-2xl border border-border bg-card p-3 text-foreground"
                maxLength={SUBMISSION_LIMITS.area}
                onChangeText={(value) => updateForm("area", value)}
                placeholder="Area, city, or province"
                placeholderTextColor="#64748b"
                value={form.area}
              />
              <View className="flex-row gap-2">
                <TextInput
                  className="flex-1 rounded-2xl border border-border bg-card p-3 text-foreground"
                  keyboardType="decimal-pad"
                  onChangeText={(value) => updateForm("lat", value)}
                  placeholder="Latitude"
                  placeholderTextColor="#64748b"
                  value={form.lat}
                />
                <TextInput
                  className="flex-1 rounded-2xl border border-border bg-card p-3 text-foreground"
                  keyboardType="decimal-pad"
                  onChangeText={(value) => updateForm("lng", value)}
                  placeholder="Longitude"
                  placeholderTextColor="#64748b"
                  value={form.lng}
                />
              </View>
              <View className="flex-row gap-2">
                {(["easy", "moderate", "hard"] as const).map((difficulty) => (
                  <View className="flex-1" key={difficulty}>
                    <MobileButton
                      variant={
                        form.entryDifficulty === difficulty ? "primary" : "secondary"
                      }
                      onPress={() => updateForm("entryDifficulty", difficulty)}
                    >
                      {difficulty === "easy"
                        ? "Easy"
                        : difficulty === "moderate"
                          ? "Moderate"
                          : "Hard"}
                    </MobileButton>
                  </View>
                ))}
              </View>
              <TextInput
                className="min-h-24 rounded-2xl border border-border bg-card p-3 text-foreground"
                maxLength={SUBMISSION_LIMITS.descriptionMax}
                multiline
                onChangeText={(value) => updateForm("description", value)}
                placeholder="Description"
                placeholderTextColor="#64748b"
                value={form.description}
              />
              <View className="flex-row gap-2">
                <TextInput
                  className="flex-1 rounded-2xl border border-border bg-card p-3 text-foreground"
                  keyboardType="decimal-pad"
                  onChangeText={(value) => updateForm("depthMinM", value)}
                  placeholder="Min depth"
                  placeholderTextColor="#64748b"
                  value={form.depthMinM}
                />
                <TextInput
                  className="flex-1 rounded-2xl border border-border bg-card p-3 text-foreground"
                  keyboardType="decimal-pad"
                  onChangeText={(value) => updateForm("depthMaxM", value)}
                  placeholder="Max depth"
                  placeholderTextColor="#64748b"
                  value={form.depthMaxM}
                />
              </View>
              <TextInput
                className="rounded-2xl border border-border bg-card p-3 text-foreground"
                onChangeText={(value) => updateForm("hazards", value)}
                placeholder="Hazards, separated by commas"
                placeholderTextColor="#64748b"
                value={form.hazards}
              />
              <TextInput
                className="rounded-2xl border border-border bg-card p-3 text-foreground"
                maxLength={SUBMISSION_LIMITS.bestSeason}
                onChangeText={(value) => updateForm("bestSeason", value)}
                placeholder="Best season"
                placeholderTextColor="#64748b"
                value={form.bestSeason}
              />
              <TextInput
                className="rounded-2xl border border-border bg-card p-3 text-foreground"
                maxLength={SUBMISSION_LIMITS.typicalConditions}
                onChangeText={(value) => updateForm("typicalConditions", value)}
                placeholder="Typical conditions"
                placeholderTextColor="#64748b"
                value={form.typicalConditions}
              />
              <TextInput
                className="rounded-2xl border border-border bg-card p-3 text-foreground"
                maxLength={SUBMISSION_LIMITS.access}
                onChangeText={(value) => updateForm("access", value)}
                placeholder="Access notes"
                placeholderTextColor="#64748b"
                value={form.access}
              />
              <TextInput
                className="rounded-2xl border border-border bg-card p-3 text-foreground"
                maxLength={280}
                onChangeText={(value) => updateForm("fees", value)}
                placeholder="Fees"
                placeholderTextColor="#64748b"
                value={form.fees}
              />
              <MobileButton
                disabled={!canUseMemberActions || submitSite.isPending}
                onPress={() => {
                  const result = validateSubmission(form);
                  if ("error" in result) {
                    setFormMessage(result.error ?? "Check the site details and try again.");
                    return;
                  }
                  submitSite.mutate(result.payload, {
                    onError: (error) => {
                      setFormMessage(
                        firstServerError(
                          error,
                          "Could not submit this dive spot. Check the details and try again.",
                        ),
                      );
                    },
                    onSuccess: () => {
                      setForm(initialForm);
                      setFormMessage("Submission received. Status: pending review.");
                      setShowSubmit(false);
                    },
                  });
                }}
              >
                Submit for review
              </MobileButton>
            </View>
          ) : null}

          {submissionsQuery.isLoading ? (
            <MobileLoadingState message="Loading your submissions." />
          ) : null}
          {submissionsQuery.error && canUseMemberActions ? (
            <View className="gap-3">
              <MobileErrorState
                message="Your submissions are taking longer than expected to load."
                title="Submissions unavailable"
              />
              <MobileButton
                variant="secondary"
                onPress={() => void submissionsQuery.refetch()}
              >
                Try again
              </MobileButton>
            </View>
          ) : null}
          {!submissionsQuery.isLoading &&
          !submissionsQuery.error &&
          canUseMemberActions &&
          submissions.length === 0 ? (
            <MobileEmptyState
              description="Submitted dive spots will appear here while they are reviewed."
              title="No submissions yet"
            />
          ) : null}
          {submissions.length > 0 ? (
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">My submissions</Text>
              {submissions.map((submission) => (
                <View
                  className="rounded-2xl border border-border bg-card p-3"
                  key={submission.id}
                >
                  <Text className="text-sm font-semibold text-foreground">
                    {submission.name}
                  </Text>
                  <Text className="text-sm text-muted-foreground">
                    {submission.area || "Area pending"} ·{" "}
                    {submission.moderationState === "pending"
                      ? "Pending review"
                      : submission.moderationState === "approved"
                        ? "Approved"
                        : "Hidden"}
                  </Text>
                  {submission.moderationReason ? (
                    <Text className="mt-1 text-sm text-muted-foreground">
                      Note: {submission.moderationReason}
                    </Text>
                  ) : null}
                </View>
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
                actionsDisabled={
                  !canUseMemberActions || likeSite.isPending || saveSite.isPending
                }
                key={site.id}
                site={site}
                onLike={(item) =>
                  likeSite.mutate(
                    {
                      siteId: item.id,
                      viewerHasLiked: item.viewerHasLiked,
                    },
                    {
                      onError: (error) => {
                        if (error instanceof FphgoApiError && isAuthErrorStatus(error.status)) {
                          setActionMessage("Sign in to like dive spots.");
                          return;
                        }
                        setActionMessage("Could not update like. Try again.");
                        void outbox.enqueue({
                          entityId: item.id,
                          entityType: "explore_site",
                          operationType: "explore_site_like",
                          payload: {
                            siteId: item.id,
                            viewerHasLiked: item.viewerHasLiked,
                          },
                        });
                      },
                    },
                  )
                }
                onSave={(item) =>
                  saveSite.mutate(
                    { isSaved: item.isSaved, siteId: item.id },
                    {
                      onError: (error) => {
                        if (error instanceof FphgoApiError && isAuthErrorStatus(error.status)) {
                          setActionMessage("Sign in to save dive spots.");
                          return;
                        }
                        setActionMessage("Could not update saved spot. Try again.");
                        void outbox.enqueue({
                          entityId: item.id,
                          entityType: "explore_site",
                          operationType: "explore_site_save",
                          payload: { isSaved: item.isSaved, siteId: item.id },
                        });
                      },
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
