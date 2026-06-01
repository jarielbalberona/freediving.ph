import { useAuth } from "@clerk/expo";
import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import {
  MobileErrorState,
  MobileLoadingState,
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";
import {
  normalizeProfileDiveSpotHighlights,
  useProfileMediaQuery,
} from "@/features/media/hooks/use-profile-media-query";
import { ProfileDetailRow } from "@/features/profiles/components/profile-detail-row";
import { ProfileBadgesSection } from "@/features/profiles/components/profile-badges-section";
import { ProfileDiveIdentitySummary } from "@/features/profiles/components/profile-dive-identity-summary";
import { ProfileDivingSection } from "@/features/profiles/components/profile-diving-section";
import {
  type HeaderProfile,
  ProfileHeader,
} from "@/features/profiles/components/profile-header";
import { ProfileDiveSpotHighlights } from "@/features/profiles/components/profile-dive-spot-highlights";
import {
  ProfileDiveMapSection,
  ProfileJourneySection,
  ProfilePassportSection,
} from "@/features/profiles/components/profile-experience-sections";
import { ProfileMediaMasonryGrid } from "@/features/profiles/components/profile-media-masonry-grid";
import { ProfileTab, ProfileTabs } from "@/features/profiles/components/profile-tabs";
import {
  useProfileBadgesQuery,
  useProfileDiveMapQuery,
  useProfileDiveMemoriesQuery,
  useProfileDivingQuery,
  useProfileJourneyQuery,
  useProfilePassportQuery,
} from "@/features/profiles/hooks/use-profile-activity-query";
import { useUpdateMyProfileMutation } from "@/features/profiles/hooks/use-profile-mutations";
import { useMyProfileQuery } from "@/features/profiles/hooks/use-my-profile-query";
import {
  certLevelLabel,
  profileCountLabel,
  profileLocationLabel,
} from "@/features/profiles/lib/profile-format";
import { useLocalDraft } from "@/local/drafts/use-local-draft";
import { useOutbox } from "@/local/outbox/use-outbox";
import { PendingSyncPanel } from "@/local/sync/pending-sync-panel";

type ProfileEditDraft = {
  avatarUrl?: string;
  bio?: string;
  certLevel?: string;
  displayName: string;
  homeArea?: string;
  interests?: string;
};

export function ProfileScreen() {
  const { isLoaded, isSignedIn } = useAuth();
  const profileQuery = useMyProfileQuery();
  const profile = profileQuery.data?.profile;
  const updateProfile = useUpdateMyProfileMutation();
  const mediaQuery = useProfileMediaQuery(profile?.username);
  const divingQuery = useProfileDivingQuery(profile?.username);
  const badgesQuery = useProfileBadgesQuery(profile?.username);
  const diveMapQuery = useProfileDiveMapQuery(profile?.username);
  const passportQuery = useProfilePassportQuery(profile?.username);
  const journeyQuery = useProfileJourneyQuery(profile?.username);
  const memoriesQuery = useProfileDiveMemoriesQuery(profile?.username);
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");
  const [isEditing, setIsEditing] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | undefined>();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [homeArea, setHomeArea] = useState("");
  const [certLevelDraft, setCertLevelDraft] = useState("");
  const [interests, setInterests] = useState("");
  const profileDraft = useLocalDraft<ProfileEditDraft>("profile_edit");
  const outbox = useOutbox();
  const posts = mediaQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const highlights = normalizeProfileDiveSpotHighlights(posts);
  const presences = divingQuery.data?.presences ?? [];
  const affinities = divingQuery.data?.affinities ?? [];
  const profileWithOptionalCounts = profile as
    | (typeof profile & { counts?: { mediaPosts?: number } })
    | null;
  const derivedPostsCount = mediaQuery.hasNextPage ? `${posts.length}+` : posts.length;
  const postsStatValue =
    profileWithOptionalCounts?.counts?.mediaPosts ?? derivedPostsCount;

  useEffect(() => {
    if (!profileDraft.draft) return;
    setAvatarUrl(profileDraft.draft.payload.avatarUrl ?? "");
    setDisplayName(profileDraft.draft.payload.displayName);
    setBio(profileDraft.draft.payload.bio ?? "");
    setCertLevelDraft(profileDraft.draft.payload.certLevel ?? "");
    setHomeArea(profileDraft.draft.payload.homeArea ?? "");
    setInterests(profileDraft.draft.payload.interests ?? "");
    setIsEditing(true);
  }, [profileDraft.draft]);

  if (profileQuery.isLoading) {
    return (
      <MobileScrollScreen subtitle="Your diver profile" title="Profile">
        <MobileLoadingState message="Loading your profile." />
      </MobileScrollScreen>
    );
  }

  if (profileQuery.error) {
    return (
      <MobileScrollScreen subtitle="Your diver profile" title="Profile">
        <View className="gap-3">
          <MobileErrorState
            message="Your profile is taking longer than expected to load."
            title="Profile unavailable"
          />
          <MobileButton variant="secondary" onPress={() => void profileQuery.refetch()}>
            Try again
          </MobileButton>
        </View>
      </MobileScrollScreen>
    );
  }

  if (!profile) {
    return (
      <MobileScrollScreen subtitle="Your diver profile" title="Profile">
        <Text className="text-sm text-muted-foreground">Profile data is unavailable.</Text>
      </MobileScrollScreen>
    );
  }

  const location = profileLocationLabel(profile);
  const certLevel = certLevelLabel(profile.certLevel);
  const requireSignedIn = () => {
    if (!isLoaded) {
      setActionMessage("Checking your session. Try again in a moment.");
      return false;
    }
    if (!isSignedIn) {
      setActionMessage("Sign in to edit your profile.");
      return false;
    }
    setActionMessage(undefined);
    return true;
  };

  const headerStats = [
    { label: "Posts", value: postsStatValue },
    { label: "Followers", value: 0 },
    { label: "Following", value: 0 },
  ];

  return (
    <MobileScrollScreen subtitle="Your diver profile" title="Profile">
      <MobileSection>
        <ProfileHeader
          isOwner
          onEdit={() => {
            setAvatarUrl(profile.avatarUrl ?? "");
            setDisplayName(profile.displayName);
            setBio(profile.bio ?? "");
            setHomeArea(profile.homeArea || profile.location || "");
            setCertLevelDraft(profile.certLevel ?? "");
            setInterests((profile.interests ?? []).join(", "));
            setIsEditing((value) => !value);
          }}
          profile={profile as HeaderProfile}
          stats={headerStats}
        />
      </MobileSection>

      <ProfileDiveSpotHighlights highlights={highlights} />
      <ProfileDiveIdentitySummary
        badges={badgesQuery.data}
        diveMap={diveMapQuery.data}
        hasError={Boolean(
          badgesQuery.error ||
            diveMapQuery.error ||
            passportQuery.error ||
            journeyQuery.error ||
            memoriesQuery.error,
        )}
        isLoading={
          badgesQuery.isLoading ||
          diveMapQuery.isLoading ||
          passportQuery.isLoading ||
          journeyQuery.isLoading ||
          memoriesQuery.isLoading
        }
        journey={journeyQuery.data}
        memories={memoriesQuery.data}
        passport={passportQuery.data}
      />

      <ProfileTabs activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === "posts" ? (
        <MobileSection title="Posts">
          <ProfileMediaMasonryGrid
            error={mediaQuery.error}
            hasNextPage={Boolean(mediaQuery.hasNextPage)}
            isFetchingNextPage={mediaQuery.isFetchingNextPage}
            isLoading={mediaQuery.isLoading}
            items={posts}
            onLoadMore={() => void mediaQuery.fetchNextPage()}
          />
        </MobileSection>
      ) : null}

      {activeTab === "badges" ? (
        <MobileSection title="Badges & credentials">
          <ProfileBadgesSection
            autoStats={badgesQuery.data?.autoStats ?? []}
            badges={badgesQuery.data?.badges ?? []}
            error={badgesQuery.error}
            isLoading={badgesQuery.isLoading}
          />
        </MobileSection>
      ) : null}

      {activeTab === "diving" ? (
        <MobileSection title="Diving">
          <ProfileDivingSection
            affinities={affinities}
            error={divingQuery.error}
            isLoading={divingQuery.isLoading}
            presences={presences}
          />
        </MobileSection>
      ) : null}

      {activeTab === "dive-map" ? (
        <MobileSection
          title="Dive Map"
          description="Proof-backed locations from this diver's own qualifying media posts."
        >
          <ProfileDiveMapSection
            data={diveMapQuery.data}
            error={diveMapQuery.error}
            isLoading={diveMapQuery.isLoading}
            isOwner
          />
        </MobileSection>
      ) : null}

      {activeTab === "dive-journey" ? (
        <MobileSection title="Dive Journey">
          <ProfileJourneySection
            data={journeyQuery.data}
            error={journeyQuery.error}
            isLoading={journeyQuery.isLoading}
            isOwner
          />
        </MobileSection>
      ) : null}

      {activeTab === "dive-passport" ? (
        <MobileSection title="Dive Passport">
          <ProfilePassportSection
            data={passportQuery.data}
            error={passportQuery.error}
            isLoading={passportQuery.isLoading}
          />
        </MobileSection>
      ) : null}

      {isEditing ? (
        <MobileSection title="Edit profile">
          <View className="gap-3">
            <PendingSyncPanel
              isSyncing={outbox.isSyncing}
              items={outbox.items}
              message={
                profileDraft.status === "saved" ? "Saved as draft" : outbox.message
              }
              onDiscard={outbox.discard}
              onSyncNow={outbox.syncNow}
            />
            {actionMessage ? (
              <Text className="text-sm text-muted-foreground">{actionMessage}</Text>
            ) : null}
            <TextInput
              className="rounded-2xl border border-border bg-card p-3 text-foreground"
              onChangeText={setDisplayName}
              placeholder="Display name"
              placeholderTextColor="#64748b"
              value={displayName}
            />
            <TextInput
              autoCapitalize="none"
              className="rounded-2xl border border-border bg-card p-3 text-foreground"
              keyboardType="url"
              onChangeText={setAvatarUrl}
              placeholder="Avatar image URL"
              placeholderTextColor="#64748b"
              value={avatarUrl}
            />
            <TextInput
              className="min-h-24 rounded-2xl border border-border bg-card p-3 text-foreground"
              multiline
              onChangeText={setBio}
              placeholder="Bio"
              placeholderTextColor="#64748b"
              value={bio}
            />
            <TextInput
              className="rounded-2xl border border-border bg-card p-3 text-foreground"
              onChangeText={setHomeArea}
              placeholder="Home area"
              placeholderTextColor="#64748b"
              value={homeArea}
            />
            <TextInput
              className="rounded-2xl border border-border bg-card p-3 text-foreground"
              onChangeText={setCertLevelDraft}
              placeholder="Certification"
              placeholderTextColor="#64748b"
              value={certLevelDraft}
            />
            <TextInput
              className="min-h-20 rounded-2xl border border-border bg-card p-3 text-foreground"
              multiline
              onChangeText={setInterests}
              placeholder="Interests, separated by commas"
              placeholderTextColor="#64748b"
              value={interests}
            />
            <MobileButton
              variant="secondary"
              onPress={() =>
                void profileDraft.save({
                  avatarUrl: avatarUrl.trim() || undefined,
                  bio: bio.trim() || undefined,
                  certLevel: certLevelDraft.trim() || undefined,
                  displayName: displayName.trim(),
                  homeArea: homeArea.trim() || undefined,
                  interests: interests.trim() || undefined,
                })
              }
            >
              Save draft
            </MobileButton>
            {profileDraft.draft ? (
              <MobileButton
                variant="ghost"
                onPress={() =>
                  void profileDraft.discard().then(() => {
                    setActionMessage("Draft discarded.");
                    setAvatarUrl(profile.avatarUrl ?? "");
                    setBio(profile.bio ?? "");
                    setCertLevelDraft(profile.certLevel ?? "");
                    setDisplayName(profile.displayName);
                    setHomeArea(profile.homeArea || profile.location || "");
                    setInterests((profile.interests ?? []).join(", "));
                  })
                }
              >
                Discard draft
              </MobileButton>
            ) : null}
            <MobileButton
              disabled={updateProfile.isPending || displayName.trim().length < 2}
              onPress={() => {
                if (!requireSignedIn()) return;
                updateProfile.mutate(
                  {
                    avatarUrl: avatarUrl.trim() || undefined,
                    bio: bio.trim() || undefined,
                    certLevel: certLevelDraft.trim() || undefined,
                    displayName: displayName.trim(),
                    homeArea: homeArea.trim() || undefined,
                    interests: interests
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean)
                      .slice(0, 8),
                    location: homeArea.trim() || undefined,
                  },
                  {
                    onError: () => {
                      void profileDraft.save({
                        avatarUrl: avatarUrl.trim() || undefined,
                        bio: bio.trim() || undefined,
                        certLevel: certLevelDraft.trim() || undefined,
                        displayName: displayName.trim(),
                        homeArea: homeArea.trim() || undefined,
                        interests: interests.trim() || undefined,
                      });
                      setActionMessage("Could not update profile. Saved as draft.");
                    },
                    onSuccess: () => {
                      void profileDraft.clearSubmitted();
                      setIsEditing(false);
                    },
                  },
                );
              }}
            >
              Save profile
            </MobileButton>
          </View>
        </MobileSection>
      ) : null}

      <MobileSection title="Diver details">
        <View className="gap-3">
          <ProfileDetailRow label="Home area" value={location} />
          <ProfileDetailRow label="Certification" value={certLevel} />
          <ProfileDetailRow
            label="Buddies"
            value={profileCountLabel(profile.buddyCount, "buddies")}
          />
          <ProfileDetailRow
            label="Dive reports"
            value={profileCountLabel(profile.reportCount, "reports")}
          />
          {profile.interests?.length ? (
            <ProfileDetailRow
              label="Interests"
              value={profile.interests.join(", ")}
            />
          ) : null}
        </View>
      </MobileSection>

      <MobileSection title="Settings">
        <Link href="/(app)/(tabs)/(home)/profile/settings" asChild>
          <Pressable accessibilityRole="link">
            <View className="rounded-2xl border border-border bg-card p-4">
              <Text className="text-base font-semibold text-foreground">Account settings</Text>
              <Text className="mt-1 text-sm leading-6 text-muted-foreground">
                Manage sign-out and account access from settings.
              </Text>
            </View>
          </Pressable>
        </Link>
      </MobileSection>
    </MobileScrollScreen>
  );
}
