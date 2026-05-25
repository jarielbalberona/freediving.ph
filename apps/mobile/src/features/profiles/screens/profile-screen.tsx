import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import {
  MobileEmptyState,
  MobileErrorState,
  MobileLoadingState,
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";
import { ProfileDetailRow } from "@/features/profiles/components/profile-detail-row";
import { ProfileSummaryCard } from "@/features/profiles/components/profile-summary-card";
import {
  useProfileDivingQuery,
  useProfilePostsQuery,
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
  const profileQuery = useMyProfileQuery();
  const profile = profileQuery.data?.profile;
  const updateProfile = useUpdateMyProfileMutation();
  const postsQuery = useProfilePostsQuery(profile?.username);
  const divingQuery = useProfileDivingQuery(profile?.username);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const profileDraft = useLocalDraft<{ bio?: string; displayName: string }>("profile_edit");
  const outbox = useOutbox();
  const posts = postsQuery.data ?? [];

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
          <MobileButton
            variant="secondary"
            onPress={() => void profileQuery.refetch()}
          >
            Try again
          </MobileButton>
        </View>
      </MobileScrollScreen>
    );
  }

  if (!profile) {
    return (
      <MobileScrollScreen subtitle="Your diver profile" title="Profile">
        <MobileEmptyState
          description="Your profile is ready. Add more details on the web while mobile editing is being prepared."
          title="Profile ready"
        />
      </MobileScrollScreen>
    );
  }

  const location = profileLocationLabel(profile);
  const certLevel = certLevelLabel(profile.certLevel);

  return (
    <MobileScrollScreen subtitle="Your diver profile" title="Profile">
      <MobileSection
        description="Review how your profile appears across the Freediving Philippines community."
        title="Your profile"
      >
        <ProfileSummaryCard
          avatarUrl={profile.avatarUrl}
          bio={profile.bio}
          displayName={profile.displayName}
          meta={location || certLevel}
          username={profile.username}
        />
        <View className="mt-3">
          <MobileButton
            variant="secondary"
            onPress={() => {
              setDisplayName(profile.displayName);
              setBio(profile.bio ?? "");
              setIsEditing((value) => !value);
            }}
          >
            {isEditing ? "Cancel edit" : "Edit profile"}
          </MobileButton>
        </View>
      </MobileSection>

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
            <MobileButton
              disabled={updateProfile.isPending || displayName.trim().length < 2}
              onPress={() =>
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
                      void outbox.enqueue({
                        entityType: "profile",
                        operationType: "profile_edit_update",
                        payload: {
                          bio: bio.trim() || undefined,
                          displayName: displayName.trim(),
                        },
                      });
                    },
                    onSuccess: () => {
                      void profileDraft.clearSubmitted();
                      setIsEditing(false);
                    },
                  },
                )
              }
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

      <MobileSection title="Posts">
        <View className="gap-3">
          <ProfileDetailRow label="Public posts" value={profileCountLabel(posts.length, "posts")} />
          <ProfileDetailRow
            label="Dive presence"
            value={profileCountLabel(divingQuery.data?.presences.length ?? 0, "entries")}
          />
          <ProfileDetailRow
            label="Dive sites"
            value={profileCountLabel(divingQuery.data?.affinities.length ?? 0, "sites")}
          />
        </View>
      </MobileSection>

      <MobileSection title="Settings">
        <Link href="/(app)/(tabs)/profile/settings" asChild>
          <Pressable accessibilityRole="link">
            <View className="rounded-2xl border border-border bg-card p-4">
              <Text className="text-base font-semibold text-foreground">
                Account settings
              </Text>
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
