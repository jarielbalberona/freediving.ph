import { Image } from "expo-image";
import { Stack, useLocalSearchParams } from "expo-router";
import type React from "react";
import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useAuth } from "@clerk/expo";
import type {
  CreateDivePresenceRequest,
  CreateDiveSiteAffinityRequest,
  CreateDiveSiteReviewRequest,
  CreateExploreSiteEditProposalRequest,
  CreateExploreSiteUpdateRequest,
  DivePresenceItem,
  DiveSiteAffinityItem,
  DiveSiteReviewItem,
  ExploreSiteDetail,
} from "@freediving.ph/types";

import {
  AvatarIdentityRow,
  SocialActionRow,
  SocialMetadataLine,
  StatusPill,
} from "@/components/social";
import {
  MobileEmptyState,
  MobileErrorState,
  MobileLoadingState,
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";
import { ExploreDetailRow } from "@/features/explore/components/explore-detail-row";
import {
  useCreateExploreSiteAffinityMutation,
  useCreateExploreSiteEditProposalMutation,
  useCreateExploreSitePresenceMutation,
  useCreateExploreSiteReviewMutation,
  useCreateExploreSiteUpdateMutation,
  useExploreSiteLikeMutation,
  useExploreSiteSaveMutation,
} from "@/features/explore/hooks/use-explore-mutations";
import { useExploreSiteDetailQuery } from "@/features/explore/hooks/use-explore-site-detail-query";
import {
  useExploreSiteAffinitiesQuery,
  useExploreSiteCommunityPostsQuery,
  useExploreSitePresenceQuery,
  useExploreSiteRelatedQuery,
  useExploreSiteReviewsQuery,
  useDiveSiteMomentsQuery,
} from "@/features/explore/hooks/use-explore-site-related-query";
import { MobileMomentPlayer } from "@/features/media/components/mobile-moment-player";
import {
  formatDepthRange,
  titleCase,
  verificationLabel,
} from "@/features/explore/lib/explore-format";

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

type SiteEditFormState = {
  access: string;
  bestSeason: string;
  depthMaxM: string;
  depthMinM: string;
  description: string;
  entryDifficulty: CreateExploreSiteEditProposalRequest["entryDifficulty"];
  fees: string;
  hazards: string;
  lat: string;
  lng: string;
  name: string;
  typicalConditions: string;
};

const siteToEditForm = (site: ExploreSiteDetail): SiteEditFormState => ({
  access: site.access ?? "",
  bestSeason: site.bestSeason ?? "",
  depthMaxM: site.depthMaxM == null ? "" : String(site.depthMaxM),
  depthMinM: site.depthMinM == null ? "" : String(site.depthMinM),
  description: site.description ?? "",
  entryDifficulty: site.difficulty,
  fees: site.fees ?? "",
  hazards: site.hazards.join(", "),
  lat: site.latitude == null ? "" : String(site.latitude),
  lng: site.longitude == null ? "" : String(site.longitude),
  name: site.name,
  typicalConditions: site.typicalConditions ?? "",
});

const parseOptionalNumber = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const optionalText = (value: string) => value.trim() || undefined;

const parseHazards = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const toEditProposalPayload = (
  form: SiteEditFormState,
): CreateExploreSiteEditProposalRequest | string => {
  const name = form.name.trim();
  const description = form.description.trim();
  const lat = Number(form.lat);
  const lng = Number(form.lng);
  const depthMinM = parseOptionalNumber(form.depthMinM);
  const depthMaxM = parseOptionalNumber(form.depthMaxM);

  if (name.length < 3) return "Site name must be at least 3 characters.";
  if (description.length < 12) return "Description must be at least 12 characters.";
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return "Latitude must be between -90 and 90.";
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    return "Longitude must be between -180 and 180.";
  }
  if (
    (depthMinM !== undefined && !Number.isFinite(depthMinM)) ||
    (depthMaxM !== undefined && !Number.isFinite(depthMaxM))
  ) {
    return "Depth must be a number.";
  }

  return {
    access: optionalText(form.access),
    bestSeason: optionalText(form.bestSeason),
    depthMaxM,
    depthMinM,
    description,
    entryDifficulty: form.entryDifficulty,
    fees: optionalText(form.fees),
    hazards: parseHazards(form.hazards),
    lat,
    lng,
    name,
    typicalConditions: optionalText(form.typicalConditions),
  };
};

const presenceTypeLabel = (value: DivePresenceItem["presenceType"]) => {
  switch (value) {
    case "fun_dive":
      return "Fun dive";
    case "planning":
      return "Planning";
    case "training":
      return "Training";
    case "available":
    default:
      return "Available";
  }
};

const affinityLabel = (value: DiveSiteAffinityItem["relationship"]) =>
  titleCase(value);

const dateLabel = (value?: string) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const personLabel = (
  item: Pick<DivePresenceItem | DiveSiteAffinityItem | DiveSiteReviewItem, "displayName" | "username">,
) => item.displayName || item.username || "Freediver";

function RelatedPersonRow({
  avatarUrl,
  meta,
  name,
  note,
  status,
}: {
  avatarUrl?: string;
  meta: Array<string | undefined>;
  name: string;
  note?: string;
  status?: React.ReactNode;
}) {
  return (
    <View className="rounded-2xl border border-border bg-card p-3">
      <AvatarIdentityRow avatarUrl={avatarUrl} meta={meta} name={name} trailing={status}>
        {note ? (
          <Text className="mt-2 text-sm leading-5 text-muted-foreground">
            {note}
          </Text>
        ) : null}
      </AvatarIdentityRow>
    </View>
  );
}

export function ExploreSiteDetailScreen() {
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const slug = firstParam(params.slug);
  const { isLoaded, isSignedIn } = useAuth();
  const detailQuery = useExploreSiteDetailQuery(slug);
  const relatedQuery = useExploreSiteRelatedQuery(slug);
  const presenceQuery = useExploreSitePresenceQuery(slug);
  const affinitiesQuery = useExploreSiteAffinitiesQuery(slug);
  const reviewsQuery = useExploreSiteReviewsQuery(slug);
  const communityPostsQuery = useExploreSiteCommunityPostsQuery(slug);
  const likeMutation = useExploreSiteLikeMutation();
  const saveMutation = useExploreSiteSaveMutation();
  const updateMutation = useCreateExploreSiteUpdateMutation();
  const editProposalMutation = useCreateExploreSiteEditProposalMutation();
  const presenceMutation = useCreateExploreSitePresenceMutation();
  const affinityMutation = useCreateExploreSiteAffinityMutation();
  const reviewMutation = useCreateExploreSiteReviewMutation();
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [showPresenceForm, setShowPresenceForm] = useState(false);
  const [showAffinityForm, setShowAffinityForm] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [detailSaved, setDetailSaved] = useState(false);
  const data = detailQuery.data;
  const site = data?.site;
  const momentsQuery = useDiveSiteMomentsQuery(site?.id);
  const [editForm, setEditForm] = useState<SiteEditFormState | null>(null);
  const [reportForm, setReportForm] = useState<CreateExploreSiteUpdateRequest>({
    conditionCurrent: "none",
    conditionWaves: "calm",
    note: "",
  });
  const [presenceForm, setPresenceForm] = useState<CreateDivePresenceRequest>({
    contactEnabled: true,
    flexible: true,
    note: "",
    presenceType: "available",
    visibility: "members",
  });
  const [affinityForm, setAffinityForm] = useState<CreateDiveSiteAffinityRequest>({
    contactEnabled: false,
    note: "",
    relationship: "regular",
    visibility: "members",
  });
  const [reviewForm, setReviewForm] = useState<CreateDiveSiteReviewRequest>({
    comment: "",
    rating: 5,
    visibility: "members",
  });
  const depthRange = site ? formatDepthRange(site) : undefined;
  const conditionSummary = site?.lastConditionSummary || site?.typicalConditions;
  const canUseMemberActions = isLoaded && Boolean(isSignedIn);
  const related = relatedQuery.data;
  const presenceItems =
    presenceQuery.data?.items ??
    related?.previews.availableBuddies ??
    related?.previews.buddies ??
    [];
  const affinityItems =
    affinitiesQuery.data?.items ?? related?.previews.localRegulars ?? [];
  const reviewItems = reviewsQuery.data?.items ?? related?.previews.reviews ?? [];
  const communityPosts =
    communityPostsQuery.data?.items ?? related?.previews.communityPosts ?? [];
  const reviewCount =
    reviewsQuery.data?.reviewCount ?? related?.counts.reviewCount ?? reviewItems.length;
  const averageRating =
    reviewsQuery.data?.averageRating ?? related?.counts.averageRating ?? 0;

  useEffect(() => {
    if (!site || editForm) return;
    setEditForm(siteToEditForm(site));
  }, [editForm, site]);

  if (!slug) {
    return (
      <>
        <Stack.Screen options={{ title: "Dive spot" }} />
        <MobileScrollScreen subtitle="Dive spot" title="Explore">
          <MobileEmptyState
            description="Choose a dive spot from Explore to see its details."
            title="Dive spot not found"
          />
        </MobileScrollScreen>
      </>
    );
  }

  if (detailQuery.isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: "Dive spot" }} />
        <MobileScrollScreen subtitle="Dive spot" title="Explore">
          <MobileLoadingState message="Loading dive spot." />
        </MobileScrollScreen>
      </>
    );
  }

  if (detailQuery.error) {
    return (
      <>
        <Stack.Screen options={{ title: "Dive spot" }} />
        <MobileScrollScreen subtitle="Dive spot" title="Explore">
          <View className="gap-3">
            <MobileErrorState
              message="This dive spot is taking longer than expected to load."
              title="Dive spot unavailable"
            />
            <MobileButton variant="secondary" onPress={() => void detailQuery.refetch()}>
              Try again
            </MobileButton>
          </View>
        </MobileScrollScreen>
      </>
    );
  }

  if (!site) {
    return (
      <>
        <Stack.Screen options={{ title: "Dive spot" }} />
        <MobileScrollScreen subtitle="Dive spot" title="Explore">
          <MobileEmptyState
            description="This dive spot may have been removed or is not available yet."
            title="Dive spot not found"
          />
        </MobileScrollScreen>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: site.name }} />
      <MobileScrollScreen subtitle={site.area} title={site.name}>
        <MobileSection
          description={conditionSummary ?? "Community details for this dive spot."}
          title={site.name}
        >
          <View className="gap-4">
            {site.coverMedia?.displayUrl ? (
              <Image
                accessibilityLabel=""
                className="h-52 w-full rounded-2xl bg-secondary"
                contentFit="cover"
                source={{ uri: site.coverMedia.displayUrl }}
                transition={150}
              />
            ) : null}

            <SocialMetadataLine
              values={[
                titleCase(site.difficulty),
                verificationLabel(site.verificationStatus),
                depthRange,
              ]}
            />

            <Text className="text-sm leading-6 text-muted-foreground">
              {site.description || "No site description has been added yet."}
            </Text>
          </View>
        </MobileSection>

        <MobileSection title="Dive information">
          <View className="gap-3">
            {actionMessage ? (
              <Text className="text-sm text-muted-foreground">{actionMessage}</Text>
            ) : null}
            {!canUseMemberActions ? (
              <Text className="text-sm text-muted-foreground">
                Sign in to like this dive spot. Members can also save, report
                conditions, suggest edits, or add community context.
              </Text>
            ) : null}
            <SocialActionRow
              actions={[
                {
                  accessibilityLabel: site.viewerHasLiked
                    ? "Unlike dive spot"
                    : "Like dive spot",
                  active: site.viewerHasLiked,
                  disabled: !canUseMemberActions || likeMutation.isPending,
                  icon: site.viewerHasLiked ? "fish" : "fish-outline",
                  label: `${site.viewerHasLiked ? "Liked" : "Like"} · ${
                    site.likeCount
                  }`,
                  onPress: () =>
                    likeMutation.mutate(
                      {
                        siteId: site.id,
                        viewerHasLiked: site.viewerHasLiked,
                      },
                      {
                        onError: () =>
                          setActionMessage("Could not update like. Try again."),
                        onSuccess: () =>
                          setActionMessage(
                            site.viewerHasLiked
                              ? "Removed like."
                              : "Liked dive spot.",
                          ),
                      },
                    ),
                },
                {
                  accessibilityLabel: detailSaved
                    ? "Unsave dive spot"
                    : "Save dive spot",
                  active: detailSaved,
                  disabled: !canUseMemberActions || saveMutation.isPending,
                  icon: detailSaved ? "bookmark" : "bookmark-outline",
                  label: detailSaved ? "Saved" : "Save",
                  onPress: () =>
                    saveMutation.mutate(
                      {
                        isSaved: detailSaved,
                        siteId: site.id,
                      },
                      {
                        onError: () =>
                          setActionMessage("Could not update saved spot. Try again."),
                        onSuccess: () => {
                          setDetailSaved((current) => !current);
                          setActionMessage(
                            detailSaved ? "Removed saved spot." : "Saved dive spot.",
                          );
                        },
                      },
                    ),
                },
              ]}
            />
            <View className="flex-row flex-wrap gap-2">
              <MobileButton
                disabled={!canUseMemberActions}
                variant="secondary"
                onPress={() => {
                  setFormMessage(null);
                  setShowReportForm((value) => !value);
                }}
              >
                Report conditions
              </MobileButton>
              <MobileButton
                disabled={!canUseMemberActions}
                variant="secondary"
                onPress={() => {
                  if (site) setEditForm(siteToEditForm(site));
                  setFormMessage(null);
                  setShowEditForm((value) => !value);
                }}
              >
                Suggest edit
              </MobileButton>
            </View>
            {formMessage ? (
              <Text className="text-sm text-muted-foreground">{formMessage}</Text>
            ) : null}
            {showReportForm ? (
              <View className="gap-3 rounded-2xl border border-border bg-card p-3">
                <Text className="text-sm font-semibold text-foreground">
                  Report current conditions
                </Text>
                <TextInput
                  className="min-h-20 rounded-2xl border border-border bg-background p-3 text-foreground"
                  maxLength={2000}
                  multiline
                  onChangeText={(note) =>
                    setReportForm((current) => ({ ...current, note }))
                  }
                  placeholder="What did you observe?"
                  placeholderTextColor="#64748b"
                  value={reportForm.note}
                />
                <TextInput
                  className="rounded-2xl border border-border bg-background p-3 text-foreground"
                  keyboardType="decimal-pad"
                  onChangeText={(value) =>
                    setReportForm((current) => ({
                      ...current,
                      conditionVisibilityM:
                        value.trim() === "" ? undefined : Number(value),
                    }))
                  }
                  placeholder="Visibility in meters"
                  placeholderTextColor="#64748b"
                  value={
                    reportForm.conditionVisibilityM == null
                      ? ""
                      : String(reportForm.conditionVisibilityM)
                  }
                />
                <View className="flex-row flex-wrap gap-2">
                  {(["none", "mild", "strong"] as const).map((conditionCurrent) => (
                    <MobileButton
                      key={conditionCurrent}
                      variant={
                        reportForm.conditionCurrent === conditionCurrent
                          ? "primary"
                          : "secondary"
                      }
                      onPress={() =>
                        setReportForm((current) => ({
                          ...current,
                          conditionCurrent,
                        }))
                      }
                    >
                      {titleCase(conditionCurrent)}
                    </MobileButton>
                  ))}
                </View>
                <View className="flex-row flex-wrap gap-2">
                  {(["calm", "moderate", "rough"] as const).map((conditionWaves) => (
                    <MobileButton
                      key={conditionWaves}
                      variant={
                        reportForm.conditionWaves === conditionWaves
                          ? "primary"
                          : "secondary"
                      }
                      onPress={() =>
                        setReportForm((current) => ({
                          ...current,
                          conditionWaves,
                        }))
                      }
                    >
                      {titleCase(conditionWaves)}
                    </MobileButton>
                  ))}
                </View>
                <MobileButton
                  disabled={updateMutation.isPending}
                  onPress={() =>
                    updateMutation.mutate(
                      {
                        payload: reportForm,
                        siteId: site.id,
                        slug: site.slug,
                      },
                      {
                        onError: () =>
                          setFormMessage("Could not submit condition report."),
                        onSuccess: () => {
                          setReportForm({
                            conditionCurrent: "none",
                            conditionWaves: "calm",
                            note: "",
                          });
                          setShowReportForm(false);
                          setFormMessage("Condition report submitted.");
                        },
                      },
                    )
                  }
                >
                  Submit report
                </MobileButton>
              </View>
            ) : null}
            {showEditForm && editForm ? (
              <View className="gap-3 rounded-2xl border border-border bg-card p-3">
                <Text className="text-sm font-semibold text-foreground">
                  Suggest site edit
                </Text>
                <TextInput
                  className="rounded-2xl border border-border bg-background p-3 text-foreground"
                  onChangeText={(name) =>
                    setEditForm((current) => (current ? { ...current, name } : current))
                  }
                  placeholder="Site name"
                  placeholderTextColor="#64748b"
                  value={editForm.name}
                />
                <View className="flex-row gap-2">
                  <TextInput
                    className="flex-1 rounded-2xl border border-border bg-background p-3 text-foreground"
                    keyboardType="decimal-pad"
                    onChangeText={(lat) =>
                      setEditForm((current) => (current ? { ...current, lat } : current))
                    }
                    placeholder="Latitude"
                    placeholderTextColor="#64748b"
                    value={editForm.lat}
                  />
                  <TextInput
                    className="flex-1 rounded-2xl border border-border bg-background p-3 text-foreground"
                    keyboardType="decimal-pad"
                    onChangeText={(lng) =>
                      setEditForm((current) => (current ? { ...current, lng } : current))
                    }
                    placeholder="Longitude"
                    placeholderTextColor="#64748b"
                    value={editForm.lng}
                  />
                </View>
                <View className="flex-row flex-wrap gap-2">
                  {(["easy", "moderate", "hard"] as const).map((entryDifficulty) => (
                    <MobileButton
                      key={entryDifficulty}
                      variant={
                        editForm.entryDifficulty === entryDifficulty
                          ? "primary"
                          : "secondary"
                      }
                      onPress={() =>
                        setEditForm((current) =>
                          current ? { ...current, entryDifficulty } : current,
                        )
                      }
                    >
                      {titleCase(entryDifficulty)}
                    </MobileButton>
                  ))}
                </View>
                <TextInput
                  className="min-h-24 rounded-2xl border border-border bg-background p-3 text-foreground"
                  multiline
                  onChangeText={(description) =>
                    setEditForm((current) =>
                      current ? { ...current, description } : current,
                    )
                  }
                  placeholder="Description"
                  placeholderTextColor="#64748b"
                  value={editForm.description}
                />
                <View className="flex-row gap-2">
                  <TextInput
                    className="flex-1 rounded-2xl border border-border bg-background p-3 text-foreground"
                    keyboardType="decimal-pad"
                    onChangeText={(depthMinM) =>
                      setEditForm((current) =>
                        current ? { ...current, depthMinM } : current,
                      )
                    }
                    placeholder="Min depth"
                    placeholderTextColor="#64748b"
                    value={editForm.depthMinM}
                  />
                  <TextInput
                    className="flex-1 rounded-2xl border border-border bg-background p-3 text-foreground"
                    keyboardType="decimal-pad"
                    onChangeText={(depthMaxM) =>
                      setEditForm((current) =>
                        current ? { ...current, depthMaxM } : current,
                      )
                    }
                    placeholder="Max depth"
                    placeholderTextColor="#64748b"
                    value={editForm.depthMaxM}
                  />
                </View>
                <TextInput
                  className="rounded-2xl border border-border bg-background p-3 text-foreground"
                  onChangeText={(hazards) =>
                    setEditForm((current) =>
                      current ? { ...current, hazards } : current,
                    )
                  }
                  placeholder="Hazards, separated by commas"
                  placeholderTextColor="#64748b"
                  value={editForm.hazards}
                />
                <MobileButton
                  disabled={editProposalMutation.isPending}
                  onPress={() => {
                    const payload = toEditProposalPayload(editForm);
                    if (typeof payload === "string") {
                      setFormMessage(payload);
                      return;
                    }
                    editProposalMutation.mutate(
                      { payload, slug: site.slug },
                      {
                        onError: () => setFormMessage("Could not submit edit."),
                        onSuccess: (response) => {
                          setShowEditForm(false);
                          setFormMessage(
                            response.appliedImmediately
                              ? "Edit applied."
                              : "Edit submitted for review.",
                          );
                        },
                      },
                    );
                  }}
                >
                  Submit edit
                </MobileButton>
              </View>
            ) : null}
            <ExploreDetailRow label="Area" value={site.area} />
            <ExploreDetailRow label="Recent conditions" value={conditionSummary} />
            <ExploreDetailRow label="Best season" value={site.bestSeason} />
            <ExploreDetailRow label="Access" value={site.access} />
            <ExploreDetailRow label="Fees" value={site.fees} />
            <ExploreDetailRow label="Contact" value={site.contactInfo} />
          </View>
        </MobileSection>

        <MobileSection title="Safety notes">
          <View className="gap-3">
            <ExploreDetailRow
              label="Typical conditions"
              value={site.typicalConditions}
            />
            <ExploreDetailRow
              label="Hazards"
              value={site.hazards.length > 0 ? site.hazards.join(", ") : undefined}
            />
          </View>
        </MobileSection>

        {momentsQuery.data?.items.length ? (
          <MobileSection
            description="Recent public Moments recorded at this dive spot."
            title="Moments"
          >
            <View className="gap-3">
              {momentsQuery.data.items.map((moment, index) => (
                <View
                  className="overflow-hidden rounded-2xl bg-secondary"
                  key={moment.id}
                >
                  <MobileMomentPlayer
                    accessibilityLabel={moment.caption || `${site.name} Moment`}
                    active={index === 0}
                    autoPlay={index === 0}
                    controls={index !== 0}
                    loop={index === 0}
                    muted
                    playback={moment.playback}
                    playbackUrl={moment.playbackUrl}
                  />
                </View>
              ))}
            </View>
          </MobileSection>
        ) : null}

        <MobileSection title="Status">
          <View className="gap-3">
            <ExploreDetailRow
              label="Verification"
              value={
                site.verifiedByDisplayName
                  ? `${verificationLabel(site.verificationStatus)} by ${site.verifiedByDisplayName}`
                  : verificationLabel(site.verificationStatus)
              }
            />
            <ExploreDetailRow
              label="Reports"
              value={`${site.reportCount.toLocaleString()} condition report${
                site.reportCount === 1 ? "" : "s"
              }`}
            />
            <ExploreDetailRow
              label="Last updated"
              value={dateLabel(site.lastUpdatedAt)}
            />
            <ExploreDetailRow label="Listed since" value={dateLabel(site.createdAt)} />
          </View>
        </MobileSection>

        {data.updates.length > 0 ? (
          <MobileSection title="Recent reports">
            <View>
              {data.updates.map((update) => (
                <ExploreDetailRow
                  key={update.id}
                  label={update.authorDisplayName || "Community report"}
                  value={update.note}
                />
              ))}
            </View>
          </MobileSection>
        ) : null}

        <MobileSection
          description="Presence and local affinity are community signals, not proof of a visited site."
          title="Buddies and locals"
        >
          <View className="gap-3">
            <View className="flex-row flex-wrap gap-2">
              <MobileButton
                disabled={!canUseMemberActions}
                variant="secondary"
                onPress={() => setShowPresenceForm((value) => !value)}
              >
                Mark presence
              </MobileButton>
              <MobileButton
                disabled={!canUseMemberActions}
                variant="secondary"
                onPress={() => setShowAffinityForm((value) => !value)}
              >
                Add local link
              </MobileButton>
            </View>
            {showPresenceForm ? (
              <View className="gap-3 rounded-2xl border border-border bg-card p-3">
                <Text className="text-sm font-semibold text-foreground">
                  Mark my dive presence
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {(["available", "planning", "training", "fun_dive"] as const).map(
                    (presenceType) => (
                      <MobileButton
                        key={presenceType}
                        variant={
                          presenceForm.presenceType === presenceType
                            ? "primary"
                            : "secondary"
                        }
                        onPress={() =>
                          setPresenceForm((current) => ({
                            ...current,
                            presenceType,
                          }))
                        }
                      >
                        {presenceTypeLabel(presenceType)}
                      </MobileButton>
                    ),
                  )}
                </View>
                <TextInput
                  className="rounded-2xl border border-border bg-background p-3 text-foreground"
                  maxLength={280}
                  onChangeText={(note) =>
                    setPresenceForm((current) => ({ ...current, note }))
                  }
                  placeholder="Optional note"
                  placeholderTextColor="#64748b"
                  value={presenceForm.note}
                />
                <MobileButton
                  disabled={presenceMutation.isPending}
                  onPress={() =>
                    presenceMutation.mutate(
                      { payload: presenceForm, slug: site.slug },
                      {
                        onError: () => setFormMessage("Could not mark presence."),
                        onSuccess: () => {
                          setShowPresenceForm(false);
                          setFormMessage("Presence saved.");
                        },
                      },
                    )
                  }
                >
                  Save presence
                </MobileButton>
              </View>
            ) : null}
            {showAffinityForm ? (
              <View className="gap-3 rounded-2xl border border-border bg-card p-3">
                <Text className="text-sm font-semibold text-foreground">
                  Add local or regular connection
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {(["local", "regular", "instructor", "operator", "interested"] as const).map(
                    (relationship) => (
                      <MobileButton
                        key={relationship}
                        variant={
                          affinityForm.relationship === relationship
                            ? "primary"
                            : "secondary"
                        }
                        onPress={() =>
                          setAffinityForm((current) => ({
                            ...current,
                            relationship,
                          }))
                        }
                      >
                        {affinityLabel(relationship)}
                      </MobileButton>
                    ),
                  )}
                </View>
                <TextInput
                  className="rounded-2xl border border-border bg-background p-3 text-foreground"
                  maxLength={280}
                  onChangeText={(note) =>
                    setAffinityForm((current) => ({ ...current, note }))
                  }
                  placeholder="Optional note"
                  placeholderTextColor="#64748b"
                  value={affinityForm.note}
                />
                <MobileButton
                  disabled={affinityMutation.isPending}
                  onPress={() =>
                    affinityMutation.mutate(
                      { payload: affinityForm, slug: site.slug },
                      {
                        onError: () => setFormMessage("Could not save local link."),
                        onSuccess: () => {
                          setShowAffinityForm(false);
                          setFormMessage("Local link saved.");
                        },
                      },
                    )
                  }
                >
                  Save local link
                </MobileButton>
              </View>
            ) : null}
            {relatedQuery.isLoading || presenceQuery.isLoading || affinitiesQuery.isLoading ? (
              <MobileLoadingState message="Loading community context." />
            ) : null}
            {presenceItems.length === 0 && affinityItems.length === 0 ? (
              <MobileEmptyState
                description="No buddies or locals have shared context for this site yet."
                title="No community context yet"
              />
            ) : null}
            {presenceItems.slice(0, 4).map((item) => (
              <RelatedPersonRow
                avatarUrl={item.avatarUrl}
                key={item.id}
                meta={[
                  presenceTypeLabel(item.presenceType),
                  dateLabel(item.startAt) ?? "Flexible",
                  item.contactAllowed ? "Contact allowed" : undefined,
                ]}
                name={personLabel(item)}
                note={item.note}
                status={<StatusPill>{item.visibility}</StatusPill>}
              />
            ))}
            {affinityItems.slice(0, 4).map((item) => (
              <RelatedPersonRow
                avatarUrl={item.avatarUrl}
                key={item.id}
                meta={[
                  affinityLabel(item.relationship),
                  item.contactAllowed ? "Contact allowed" : undefined,
                ]}
                name={personLabel(item)}
                note={item.note}
                status={<StatusPill>{item.visibility}</StatusPill>}
              />
            ))}
          </View>
        </MobileSection>

        <MobileSection title="Reviews">
          <View className="gap-3">
            <View className="flex-row flex-wrap items-center gap-2">
              {reviewCount > 0 ? (
                <Text className="text-sm text-muted-foreground">
                  {averageRating.toFixed(1)} average from {reviewCount} review
                  {reviewCount === 1 ? "" : "s"}
                </Text>
              ) : null}
              <MobileButton
                disabled={!canUseMemberActions}
                variant="secondary"
                onPress={() => setShowReviewForm((value) => !value)}
              >
                Review site
              </MobileButton>
            </View>
            {showReviewForm ? (
              <View className="gap-3 rounded-2xl border border-border bg-card p-3">
                <View className="flex-row flex-wrap gap-2">
                  {([1, 2, 3, 4, 5] as const).map((rating) => (
                    <MobileButton
                      key={rating}
                      variant={reviewForm.rating === rating ? "primary" : "secondary"}
                      onPress={() =>
                        setReviewForm((current) => ({ ...current, rating }))
                      }
                    >
                      {rating}/5
                    </MobileButton>
                  ))}
                </View>
                <TextInput
                  className="min-h-20 rounded-2xl border border-border bg-background p-3 text-foreground"
                  maxLength={2000}
                  multiline
                  onChangeText={(comment) =>
                    setReviewForm((current) => ({ ...current, comment }))
                  }
                  placeholder="Optional review"
                  placeholderTextColor="#64748b"
                  value={reviewForm.comment}
                />
                <MobileButton
                  disabled={reviewMutation.isPending}
                  onPress={() =>
                    reviewMutation.mutate(
                      { payload: reviewForm, slug: site.slug },
                      {
                        onError: () => setFormMessage("Could not save review."),
                        onSuccess: () => {
                          setShowReviewForm(false);
                          setFormMessage("Review saved.");
                        },
                      },
                    )
                  }
                >
                  Save review
                </MobileButton>
              </View>
            ) : null}
            {reviewsQuery.isLoading ? (
              <MobileLoadingState message="Loading reviews." />
            ) : null}
            {reviewItems.length === 0 ? (
              <MobileEmptyState
                description="No public or member-visible reviews are available yet."
                title="No reviews yet"
              />
            ) : null}
            {reviewItems.slice(0, 5).map((item) => (
              <RelatedPersonRow
                avatarUrl={item.avatarUrl}
                key={item.id}
                meta={[`${item.rating}/5`, dateLabel(item.createdAt)]}
                name={personLabel(item)}
                note={item.comment}
                status={<StatusPill>{item.visibility}</StatusPill>}
              />
            ))}
          </View>
        </MobileSection>

        {communityPosts.length > 0 ? (
          <MobileSection title="Community posts">
            <View className="gap-3">
              {communityPosts.slice(0, 5).map((item) => (
                <View
                  className="rounded-2xl border border-border bg-card p-3"
                  key={item.id}
                >
                  <Text className="text-sm font-semibold text-foreground">
                    {item.title || "Community post"}
                  </Text>
                  {item.body ? (
                    <Text
                      className="mt-1 text-sm leading-5 text-muted-foreground"
                      numberOfLines={3}
                    >
                      {item.body}
                    </Text>
                  ) : null}
                  <SocialMetadataLine
                    values={[item.actor.name, dateLabel(item.occurredAt)]}
                  />
                </View>
              ))}
            </View>
          </MobileSection>
        ) : null}
      </MobileScrollScreen>
    </>
  );
}
