import Ionicons from "@expo/vector-icons/Ionicons";
import type {
  JourneyEntry,
  PassportSectionState,
  ProfileBadgesResponse,
  ProfileDiveMapMarker,
  ProfileDiveMapResponse,
  ProfileJourneyResponse,
  ProfilePassport,
  ProfilePassportResponse,
  UpdatePassportSettingsRequest,
  UserBadge,
} from "@freediving.ph/types";
import { Link, type Href } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import {
  MobileActionSheet,
  MobileCard,
  MobileEmptyState,
  MobileErrorState,
  MobileLoadingState,
} from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";
import {
  useCreateJourneyEntryMutation,
  useDeleteJourneyEntryMutation,
  useUpdateJourneyEntryMutation,
  useUpdatePassportSettingsMutation,
} from "@/features/profiles/hooks/use-profile-experience-mutations";

const formatShortDate = (value: string | undefined) => {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return new Intl.DateTimeFormat("en-PH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatCount = (value: number | undefined) =>
  new Intl.NumberFormat().format(value ?? 0);

const sanitizeJourneyCopy = (value: string | undefined) => {
  if (!value) return value;
  return value
    .replace(/\bproof[- ]backed posts\b/gi, "location posts")
    .replace(/\bproof[- ]backed post\b/gi, "location post")
    .replace(/\bproof[- ]backed\b/gi, "location-linked");
};

const passportSectionVisible = (state: PassportSectionState) =>
  state.status === "ready";

const sectionHint = (state: PassportSectionState, fallback: string) => {
  if (state.status === "hidden") return "Hidden from this public view.";
  if (state.status === "unavailable") return "Unavailable right now.";
  return fallback;
};

type JourneyDraft = {
  body: string;
  occurredAt: string;
  title: string;
};

const createJourneyDraft = (item?: JourneyEntry | null): JourneyDraft => ({
  body: item?.body ?? "",
  occurredAt: item?.occurredAt?.slice(0, 10) ?? todayInputValue(),
  title: item?.title ?? "",
});

const todayInputValue = () => new Date().toISOString().slice(0, 10);

const journeyMeta = (item: JourneyEntry) => {
  switch (item.type) {
    case "custom":
      return {
        icon: "create-outline" as const,
        label: "Manual note",
        tone: "bg-white",
      };
    case "badge":
      return {
        icon: "ribbon-outline" as const,
        label: "Badge",
        tone: "bg-amber-50",
      };
    case "memory":
      return {
        icon: "chatbubble-ellipses-outline" as const,
        label: "Memory",
        tone: "bg-sky-50",
      };
    case "map_milestone":
      return {
        icon: "map-outline" as const,
        label: "Dive place",
        tone: "bg-emerald-50",
      };
    case "media":
      return {
        icon: "images-outline" as const,
        label: "Post",
        tone: "bg-indigo-50",
      };
    case "event":
      return {
        icon: "calendar-outline" as const,
        label: "Event",
        tone: "bg-rose-50",
      };
    default:
      return {
        icon: "git-branch-outline" as const,
        label: "Milestone",
        tone: "bg-secondary",
      };
  }
};

function SmallPill({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <View className="rounded-full bg-secondary px-3 py-1.5">
      <Text className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </Text>
      <Text className="mt-0.5 text-sm font-semibold text-foreground">
        {value}
      </Text>
    </View>
  );
}

function DiveMemoryLocationRow({
  marker,
  username,
}: {
  marker: ProfileDiveMapMarker;
  username: string;
}) {
  return (
    <Link
      href={
        {
          pathname:
            "/(app)/(tabs)/(home)/dive-memories/[entrySlug]/[username]",
          params: {
            entrySlug: marker.diveSiteSlug,
            username,
          },
        } as unknown as Href
      }
      asChild
    >
      <Pressable accessibilityRole="link">
        <MobileCard>
          <View className="gap-3">
            <View className="flex-row items-start justify-between gap-3">
              <View className="min-w-0 flex-1">
                <Text
                  className="text-sm font-semibold text-foreground"
                  numberOfLines={1}
                >
                  {marker.diveSiteName}
                </Text>
                <Text className="mt-1 text-xs text-muted-foreground">
                  {marker.diveSiteArea || "Dive spot"}
                </Text>
              </View>
              <SmallPill label="Media" value={formatCount(marker.mediaPostCount)} />
            </View>
            <View className="flex-row flex-wrap gap-2">
              <SmallPill label="Last dive" value={formatShortDate(marker.lastVisitedAt)} />
            </View>
          </View>
        </MobileCard>
      </Pressable>
    </Link>
  );
}

export function ProfileDiveMemoriesSection({
  data,
  error,
  isLoading,
  isOwner,
  username,
}: {
  data?: ProfileDiveMapResponse;
  error?: unknown;
  isLoading: boolean;
  isOwner: boolean;
  username: string;
}) {
  if (isLoading && !data) {
    return <MobileLoadingState message="Loading dive memories." />;
  }

  if (error && !data) {
    return (
      <MobileErrorState
        message="Dive places and memories are unavailable right now."
        title="Dive Memories unavailable"
      />
    );
  }

  const markers = data?.markers ?? [];
  if (markers.length === 0) {
    return (
      <MobileEmptyState
        description={
          isOwner
            ? "Places and memories will appear here after your dive posts are tagged to a dive spot."
            : "This diver has not shared any visible dive places yet."
        }
        title={isOwner ? "No dive places yet" : "No visible dive places yet"}
      />
    );
  }

  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap gap-2">
        <SmallPill
          label="Visited sites"
          value={formatCount(data?.visitedSiteCount ?? markers.length)}
        />
        <SmallPill
          label="Location posts"
          value={formatCount(
            markers.reduce((sum, item) => sum + item.mediaPostCount, 0),
          )}
        />
      </View>
      {markers.map((marker) => (
        <DiveMemoryLocationRow
          key={marker.diveSiteId}
          marker={marker}
          username={username}
        />
      ))}
      <Text className="text-xs leading-5 text-muted-foreground">
        Posts show where this diver has been. Memories shared later stay tied to
        those places and do not add new places on their own.
      </Text>
    </View>
  );
}

function JourneySheet({
  draft,
  errorMessage,
  onChange,
  onClose,
  onSubmit,
  open,
  submitLabel,
  title,
}: {
  draft: JourneyDraft;
  errorMessage?: string;
  onChange: (next: JourneyDraft) => void;
  onClose: () => void;
  onSubmit: () => void;
  open: boolean;
  submitLabel: string;
  title: string;
}) {
  return (
    <MobileActionSheet onClose={onClose} title={title} visible={open}>
      <View className="gap-3">
        <TextInput
          className="w-full rounded-2xl border border-border bg-card px-3 py-3 text-foreground"
          onChangeText={(value) => onChange({ ...draft, title: value })}
          placeholder="Title"
          placeholderTextColor="#64748b"
          value={draft.title}
        />
        <TextInput
          className="w-full rounded-2xl border border-border bg-card px-3 py-3 text-foreground"
          onChangeText={(value) => onChange({ ...draft, occurredAt: value })}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#64748b"
          value={draft.occurredAt}
        />
        <TextInput
          className="min-h-28 w-full rounded-2xl border border-border bg-card px-3 py-3 text-foreground"
          multiline
          onChangeText={(value) => onChange({ ...draft, body: value })}
          placeholder="Story"
          placeholderTextColor="#64748b"
          textAlignVertical="top"
          value={draft.body}
        />
        {errorMessage ? (
          <Text className="text-sm text-destructive">{errorMessage}</Text>
        ) : null}
        <View className="flex-row gap-2">
          <View className="flex-1">
            <MobileButton variant="ghost" onPress={onClose}>
              Cancel
            </MobileButton>
          </View>
          <View className="flex-1">
            <MobileButton onPress={onSubmit}>{submitLabel}</MobileButton>
          </View>
        </View>
      </View>
    </MobileActionSheet>
  );
}

function JourneyRow({
  isDeleting,
  isOwner,
  item,
  onDelete,
  onEdit,
}: {
  isDeleting: boolean;
  isOwner: boolean;
  item: JourneyEntry;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const meta = journeyMeta(item);
  const manual = item.type === "custom";

  return (
    <View className="flex-row gap-3">
      <View className="items-center">
        <View
          className={`h-9 w-9 items-center justify-center rounded-full border border-border ${meta.tone}`}
        >
          <Ionicons color="#0A1F2E" name={meta.icon} size={16} />
        </View>
      </View>
      <View className="min-w-0 flex-1 border-b border-border/60 pb-3">
        <View className="flex-row items-start justify-between gap-3">
          <View className="min-w-0 flex-1">
            <View className="flex-row flex-wrap items-center gap-2">
              <Text className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {meta.label}
              </Text>
              <Text className="text-[11px] text-muted-foreground">
                {manual ? "Editable" : "Generated"}
              </Text>
            </View>
            <Text className="mt-1 text-sm font-semibold text-foreground">
              {item.title}
            </Text>
            {item.body ? (
              <Text className="mt-1 text-sm leading-5 text-muted-foreground">
                {sanitizeJourneyCopy(item.body)}
              </Text>
            ) : null}
            <Text className="mt-2 text-xs text-muted-foreground">
              {formatShortDate(item.occurredAt)}
            </Text>
          </View>
          {isOwner && manual ? (
            <View className="flex-row gap-2">
              <Pressable
                accessibilityRole="button"
                className="rounded-full border border-border px-3 py-2"
                onPress={onEdit}
              >
                <Text className="text-xs font-semibold text-foreground">Edit</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                className={`rounded-full border border-border px-3 py-2 ${isDeleting ? "opacity-50" : ""}`}
                disabled={isDeleting}
                onPress={onDelete}
              >
                <Text className="text-xs font-semibold text-destructive">
                  Delete
                </Text>
              </Pressable>
            </View>
          ) : null}
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
  username,
  initialComposerOpen,
}: {
  data?: ProfileJourneyResponse;
  error?: unknown;
  isLoading: boolean;
  isOwner: boolean;
  username: string;
  initialComposerOpen?: boolean;
}) {
  const createEntry = useCreateJourneyEntryMutation(username);
  const updateEntry = useUpdateJourneyEntryMutation(username);
  const deleteEntry = useDeleteJourneyEntryMutation(username);
  const [editingEntry, setEditingEntry] = useState<JourneyEntry | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState<JourneyDraft>(createJourneyDraft());
  const didAutoOpenComposer = useRef(false);
  const mutationError =
    createEntry.error instanceof Error
      ? createEntry.error.message
      : updateEntry.error instanceof Error
        ? updateEntry.error.message
        : undefined;

  useEffect(() => {
    if (composerOpen) return;
    setDraft(createJourneyDraft());
    setEditingEntry(null);
  }, [composerOpen]);

  useEffect(() => {
    if (!isOwner) return;
    if (!initialComposerOpen) return;
    if (didAutoOpenComposer.current) return;
    didAutoOpenComposer.current = true;
    setComposerOpen(true);
    setEditingEntry(null);
    setDraft(createJourneyDraft());
  }, [initialComposerOpen, isOwner]);

  if (isLoading && !data) {
    return <MobileLoadingState message="Loading dive journey." />;
  }

  if (error && !data) {
    return (
      <MobileErrorState
        message="This diver's timeline is unavailable right now."
        title="Dive Journey unavailable"
      />
    );
  }

  const items = data?.items ?? [];
  if (items.length === 0) {
    return (
      <View className="gap-3">
        {isOwner ? (
          <MobileButton
            variant="secondary"
            onPress={() => {
              setDraft(createJourneyDraft());
              setEditingEntry(null);
              setComposerOpen(true);
            }}
          >
            Add journey note
          </MobileButton>
        ) : null}
        <MobileEmptyState
          description={
            isOwner
              ? "Your timeline will fill from posts, memories, badges, and any notes you add."
              : "This diver has not shared any visible journey milestones yet."
          }
          title={isOwner ? "No journey notes yet" : "No visible journey yet"}
        />
        <JourneySheet
          draft={draft}
          errorMessage={mutationError}
          onChange={setDraft}
          onClose={() => setComposerOpen(false)}
          onSubmit={() => {
            const payload = {
              body: draft.body.trim() || undefined,
              occurredAt: draft.occurredAt.trim() || undefined,
              title: draft.title.trim(),
              visibility: "public" as const,
            };
            if (!payload.title) return;
            createEntry.mutate(payload, {
              onSuccess: () => setComposerOpen(false),
            });
          }}
          open={composerOpen}
          submitLabel="Save note"
          title="Add journey note"
        />
      </View>
    );
  }

  return (
    <View className="gap-3">
      {isOwner ? (
        <MobileButton
          variant="secondary"
          onPress={() => {
            setDraft(createJourneyDraft());
            setEditingEntry(null);
            setComposerOpen(true);
          }}
        >
          Add journey note
        </MobileButton>
      ) : null}
      <View className="gap-3">
        {items.map((item) => (
          <JourneyRow
            key={item.id}
            isDeleting={deleteEntry.isPending}
            isOwner={isOwner}
            item={item}
            onDelete={() => deleteEntry.mutate(item.id)}
            onEdit={() => {
              setEditingEntry(item);
              setDraft(createJourneyDraft(item));
              setComposerOpen(true);
            }}
          />
        ))}
      </View>
      <JourneySheet
        draft={draft}
        errorMessage={mutationError}
        onChange={setDraft}
        onClose={() => setComposerOpen(false)}
        onSubmit={() => {
          const payload = {
            body: draft.body.trim() || undefined,
            occurredAt: draft.occurredAt.trim() || undefined,
            title: draft.title.trim(),
            visibility: "public" as const,
          };
          if (!payload.title) return;
          if (editingEntry) {
            updateEntry.mutate(
              {
                entryId: editingEntry.id,
                payload,
              },
              {
                onSuccess: () => setComposerOpen(false),
              },
            );
            return;
          }
          createEntry.mutate(payload, {
            onSuccess: () => setComposerOpen(false),
          });
        }}
        open={composerOpen}
        submitLabel={editingEntry ? "Save changes" : "Save note"}
        title={editingEntry ? "Edit journey note" : "Add journey note"}
      />
    </View>
  );
}

function ToggleRow({
  checked,
  label,
  onPress,
}: {
  checked: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      className="flex-row items-center justify-between rounded-2xl border border-border bg-card px-3 py-3"
      onPress={onPress}
    >
      <Text className="text-sm font-medium text-foreground">{label}</Text>
      <Ionicons
        color={checked ? "#0677A8" : "#94A3B8"}
        name={checked ? "checkbox-outline" : "square-outline"}
        size={20}
      />
    </Pressable>
  );
}

function PassportCustomizeSheet({
  availableBadges,
  open,
  onClose,
  onSubmit,
  settings,
  submitting,
}: {
  availableBadges: UserBadge[];
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: UpdatePassportSettingsRequest) => void;
  settings: ProfilePassport["settings"];
  submitting: boolean;
}) {
  const [draft, setDraft] = useState<UpdatePassportSettingsRequest>({
    featuredBadgeIds: settings.featuredBadgeIds,
    showBadges: settings.showBadges,
    showJourney: settings.showJourney,
    showMap: settings.showMap,
    showMemories: settings.showMemories,
  });

  useEffect(() => {
    if (!open) return;
    setDraft({
      featuredBadgeIds: settings.featuredBadgeIds,
      showBadges: settings.showBadges,
      showJourney: settings.showJourney,
      showMap: settings.showMap,
      showMemories: settings.showMemories,
    });
  }, [open, settings]);

  const visibleBadges = useMemo(
    () =>
      availableBadges
        .filter((badge) => !badge.isAutoStat)
        .slice(0, 8),
    [availableBadges],
  );

  const toggleFeaturedBadge = (badgeId: string) => {
    setDraft((current) => {
      const selected = current.featuredBadgeIds ?? [];
      const exists = selected.includes(badgeId);
      if (exists) {
        return {
          ...current,
          featuredBadgeIds: selected.filter((item) => item !== badgeId),
        };
      }
      if (selected.length >= 4) return current;
      return {
        ...current,
        featuredBadgeIds: [...selected, badgeId],
      };
    });
  };

  return (
    <MobileActionSheet
      onClose={onClose}
      title="Customize Passport"
      visible={open}
    >
      <View className="gap-3">
        <ToggleRow
          checked={draft.showMap}
          label="Show dive footprint"
          onPress={() =>
            setDraft((current) => ({ ...current, showMap: !current.showMap }))
          }
        />
        <ToggleRow
          checked={draft.showBadges}
          label="Show badges"
          onPress={() =>
            setDraft((current) => ({
              ...current,
              showBadges: !current.showBadges,
            }))
          }
        />
        <ToggleRow
          checked={draft.showJourney}
          label="Show journey highlights"
          onPress={() =>
            setDraft((current) => ({
              ...current,
              showJourney: !current.showJourney,
            }))
          }
        />
        <ToggleRow
          checked={draft.showMemories}
          label="Show memories"
          onPress={() =>
            setDraft((current) => ({
              ...current,
              showMemories: !current.showMemories,
            }))
          }
        />
        {visibleBadges.length > 0 ? (
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">
              Featured badges
            </Text>
            <Text className="text-xs text-muted-foreground">
              Pick up to four badge highlights.
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {visibleBadges.map((badge) => {
                const selected =
                  draft.featuredBadgeIds?.includes(badge.id) ?? false;
                return (
                  <Pressable
                    key={badge.id}
                    accessibilityRole="button"
                    className={`rounded-full border px-3 py-2 ${
                      selected
                        ? "border-primary bg-secondary"
                        : "border-border bg-card"
                    }`}
                    onPress={() => toggleFeaturedBadge(badge.id)}
                  >
                    <Text className="text-xs font-semibold text-foreground">
                      {badge.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
        <View className="flex-row gap-2">
          <View className="flex-1">
            <MobileButton variant="ghost" onPress={onClose}>
              Cancel
            </MobileButton>
          </View>
          <View className="flex-1">
            <MobileButton
              disabled={submitting}
              onPress={() => onSubmit(draft)}
              variant="primary"
            >
              Save passport
            </MobileButton>
          </View>
        </View>
      </View>
    </MobileActionSheet>
  );
}

function PassportHero({ passport }: { passport: ProfilePassport }) {
  const displayName =
    passport.profile.displayName || passport.profile.username || "Diver";
  const pills = [
    { label: "Posts", value: formatCount(passport.stats.mediaPostCount) },
    ...(passportSectionVisible(passport.mapPreview.state)
      ? [
          {
            label: "Sites",
            value: formatCount(passport.stats.visitedSiteCount),
          },
        ]
      : []),
    ...(passportSectionVisible(passport.badgeShowcase.state)
      ? [
          {
            label: "Badges",
            value: formatCount(passport.stats.badgeCount),
          },
        ]
      : []),
  ];

  return (
    <View className="overflow-hidden rounded-[24px] bg-sky-100">
      <View className="gap-4 px-4 py-5">
        <View className="gap-1">
          <Text className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-900/60">
            Public diver snapshot
          </Text>
          <Text className="text-2xl font-semibold text-sky-950">
            {displayName}
          </Text>
          <Text className="text-sm leading-5 text-sky-900/75">
            {passport.profile.bio?.trim() ||
              "A quick view of this diver's places, highlights, and story."}
          </Text>
        </View>
        <View className="flex-row flex-wrap gap-2">
          {pills.map((item) => (
            <View key={item.label} className="rounded-full bg-white/80 px-3 py-2">
              <Text className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-900/60">
                {item.label}
              </Text>
              <Text className="mt-0.5 text-sm font-semibold text-sky-950">
                {item.value}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function PassportSectionBlock({
  children,
  icon,
  title,
}: {
  children: React.ReactNode;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
}) {
  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-2">
        <Ionicons color="#475569" name={icon} size={16} />
        <Text className="text-sm font-semibold text-foreground">{title}</Text>
      </View>
      {children}
    </View>
  );
}

function PassportStoryPreview({ passport }: { passport: ProfilePassport }) {
  const firstJourney = passport.journeyHighlights.entries[0];
  const firstMemory = passport.memories.items[0];
  const story = firstJourney || firstMemory;

  if (!story) {
    return (
      <Text className="text-sm text-muted-foreground">
        No story preview shared yet.
      </Text>
    );
  }

  return (
    <MobileCard>
      <Text className="text-sm font-semibold text-foreground">
        {story.title}
      </Text>
      {"body" in story && story.body ? (
        <Text className="mt-1 text-sm leading-5 text-muted-foreground">
          {story.body}
        </Text>
      ) : null}
      <Text className="mt-2 text-xs text-muted-foreground">
        {formatShortDate(story.occurredAt)}
      </Text>
    </MobileCard>
  );
}

export function ProfilePassportSection({
  availableBadges = [],
  data,
  error,
  isLoading,
  isOwner,
  username,
  initialCustomizeOpen,
}: {
  availableBadges?: UserBadge[];
  data?: ProfilePassportResponse;
  error?: unknown;
  isLoading: boolean;
  isOwner: boolean;
  username: string;
  initialCustomizeOpen?: boolean;
}) {
  const updateSettings = useUpdatePassportSettingsMutation(username);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const didAutoOpenCustomize = useRef(false);

  useEffect(() => {
    if (!isOwner) return;
    if (!initialCustomizeOpen) return;
    if (didAutoOpenCustomize.current) return;
    didAutoOpenCustomize.current = true;
    setCustomizeOpen(true);
  }, [initialCustomizeOpen, isOwner]);

  if (isLoading && !data?.passport) {
    return <MobileLoadingState message="Loading dive passport." />;
  }

  if (error && !data?.passport) {
    return (
      <MobileErrorState
        message="The public passport view is unavailable right now."
        title="Dive Passport unavailable"
      />
    );
  }

  if (!data?.passport) {
    return (
      <MobileEmptyState
        description="Passport highlights will appear once this profile has public diving activity."
        title="No passport to show yet"
      />
    );
  }

  const passport = data.passport;
  const showHighlights =
    passportSectionVisible(passport.badgeShowcase.state) &&
    (passport.badgeShowcase.badges.length > 0 ||
      passport.badgeShowcase.autoStats.length > 0);
  const showFootprint = passportSectionVisible(passport.mapPreview.state);
  const showJourney = passportSectionVisible(passport.journeyHighlights.state);
  const showMemories = passportSectionVisible(passport.memories.state);

  return (
    <View className="gap-4">
      {isOwner ? (
        <MobileButton
          onPress={() => setCustomizeOpen(true)}
          variant="secondary"
        >
          Customize Passport
        </MobileButton>
      ) : null}
      <PassportHero passport={passport} />

      {showHighlights ? (
        <PassportSectionBlock icon="sparkles-outline" title="Highlights">
          <View className="flex-row flex-wrap gap-2">
            {passport.badgeShowcase.badges.map((badge) => (
              <View
                key={badge.id}
                className="rounded-full border border-border bg-card px-3 py-2"
              >
                <Text className="text-xs font-semibold text-foreground">
                  {badge.name}
                </Text>
              </View>
            ))}
            {passport.badgeShowcase.badges.length === 0
              ? passport.badgeShowcase.autoStats.map((badge) => (
                  <View
                    key={badge.id}
                    className="rounded-full border border-border bg-card px-3 py-2"
                  >
                    <Text className="text-xs font-semibold text-foreground">
                      {badge.name}
                    </Text>
                  </View>
                ))
              : null}
          </View>
        </PassportSectionBlock>
      ) : null}

      {showFootprint ? (
        <PassportSectionBlock icon="map-outline" title="Dive footprint">
          <View className="gap-2">
            <View className="flex-row flex-wrap gap-2">
              <SmallPill
                label="Visited sites"
                value={formatCount(passport.mapPreview.visitedSiteCount)}
              />
            </View>
            {passport.mapPreview.markers.slice(0, 3).map((marker) => (
              <MobileCard key={marker.diveSiteId}>
                <Text className="text-sm font-semibold text-foreground">
                  {marker.diveSiteName}
                </Text>
                <Text className="mt-1 text-xs text-muted-foreground">
                  {marker.diveSiteArea || "Dive spot"}
                </Text>
              </MobileCard>
            ))}
          </View>
        </PassportSectionBlock>
      ) : (
        <PassportSectionBlock icon="map-outline" title="Dive footprint">
          <Text className="text-sm text-muted-foreground">
            {sectionHint(
              passport.mapPreview.state,
              "No dive footprint shared yet.",
            )}
          </Text>
        </PassportSectionBlock>
      )}

      {(showJourney || showMemories) && (
        <PassportSectionBlock icon="book-outline" title="Story preview">
          <PassportStoryPreview passport={passport} />
        </PassportSectionBlock>
      )}

      <PassportCustomizeSheet
        availableBadges={availableBadges}
        onClose={() => setCustomizeOpen(false)}
        onSubmit={(payload) =>
          updateSettings.mutate(payload, {
            onSuccess: () => setCustomizeOpen(false),
          })
        }
        open={customizeOpen}
        settings={passport.settings}
        submitting={updateSettings.isPending}
      />
    </View>
  );
}

export const badgeCategoryLabel = (value: string) =>
  value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

export const groupBadgesByCategory = (
  badges: UserBadge[],
  autoStats: UserBadge[],
  categorySummaries?: ProfileBadgesResponse["categorySummaries"],
) => {
  const grouped = new Map<string, UserBadge[]>();

  for (const badge of [...badges, ...autoStats]) {
    const current = grouped.get(badge.category) ?? [];
    current.push(badge);
    grouped.set(badge.category, current);
  }

  const orderedCategories =
    categorySummaries?.map((item) => item.category) ??
    Array.from(grouped.keys()).sort();

  return orderedCategories
    .map((category) => ({
      category,
      label: badgeCategoryLabel(category),
      items: grouped.get(category) ?? [],
    }))
    .filter((group) => group.items.length > 0);
};
