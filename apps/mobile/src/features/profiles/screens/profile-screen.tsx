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
import { ProfileDivingSection } from "@/features/profiles/components/profile-diving-section";
import {
  type HeaderProfile,
  ProfileHeader,
} from "@/features/profiles/components/profile-header";
import { ProfileDiveSpotHighlights } from "@/features/profiles/components/profile-dive-spot-highlights";
import { ProfileMediaMasonryGrid } from "@/features/profiles/components/profile-media-masonry-grid";
import { ProfileTab, ProfileTabs } from "@/features/profiles/components/profile-tabs";
import {
  useProfileDivingQuery,
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

export function ProfileScreen() {
  const { isLoaded, isSignedIn } = useAuth();
  const profileQuery = useMyProfileQuery();
  const profile = profileQuery.data?.profile;
  const updateProfile = useUpdateMyProfileMutation();
  const mediaQuery = useProfileMediaQuery(profile?.username);
  const divingQuery = useProfileDivingQuery(profile?.username);
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");
  const [isEditing, setIsEditing] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | undefined>();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const profileDraft = useLocalDraft<{ bio?: string; displayName: string }>(
    "profile_edit",
  );
  const outbox = useOutbox();
  const posts = mediaQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const highlights = normalizeProfileDiveSpotHighlights(posts);
  const presences = divingQuery.data?.presences ?? [];
  const affinities = divingQuery.data?.affinities ?? [];

  useEffect(() => {
    if (!profileDraft.draft) return;
    setDisplayName(profileDraft.draft.payload.displayName);
    setBio(profileDraft.draft.payload.bio ?? "");
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
    { label: "Posts", value: posts.length },
    { label: "Followers", value: 0 },
    { label: "Following", value: 0 },
  ];

  return (
    <MobileScrollScreen subtitle="Your diver profile" title="Profile">
      <MobileSection>
        <ProfileHeader
          isOwner
          onEdit={() => {
            setDisplayName(profile.displayName);
            setBio(profile.bio ?? "");
            setIsEditing((value) => !value);
          }}
          profile={profile as HeaderProfile}
          stats={headerStats}
        />
      </MobileSection>

      <ProfileDiveSpotHighlights highlights={highlights} />

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
              className="min-h-24 rounded-2xl border border-border bg-card p-3 text-foreground"
              multiline
              onChangeText={setBio}
              placeholder="Bio"
              placeholderTextColor="#64748b"
              value={bio}
            />
            <MobileButton
              variant="secondary"
              onPress={() =>
                void profileDraft.save({
                  bio: bio.trim() || undefined,
                  displayName: displayName.trim(),
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
                    setBio(profile.bio ?? "");
                    setDisplayName(profile.displayName);
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
                    bio: bio.trim() || undefined,
                    displayName: displayName.trim(),
                  },
                  {
                    onError: () => {
                      void profileDraft.save({
                        bio: bio.trim() || undefined,
                        displayName: displayName.trim(),
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
