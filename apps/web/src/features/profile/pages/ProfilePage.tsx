"use client";

import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { useSession } from "@/features/auth/session";
import { messagesApi } from "@/features/messages/api/messages";
import { messageQueryKeys } from "@/features/messages/hooks/queries";
import {
  currentMessagePerfTime,
  logMessagingPerf,
  markThreadOpenStart,
} from "@/features/messages/lib/perf";
import { useProfileMediaInfiniteQuery } from "@/features/media/hooks";
import { useCurrentProfileHref } from "@/features/profile/hooks/use-current-profile-href";
import { ProfileHeader } from "@/features/profile/components/ProfileHeader";
import { ProfileBucketList } from "@/features/profile/components/ProfileBucketList";
import { ProfileSkeleton } from "@/features/profile/components/ProfileSkeleton";
import { ProfileTabs } from "@/features/profile/components/ProfileTabs";
import {
  useSaveUser,
  useUnsaveUser,
} from "@/features/profiles/hooks/mutations";
import { useSavedHub } from "@/features/profiles/hooks/queries";
import {
  useProfileDivingQuery,
  useProfileBadgesQuery,
  useProfileViewQuery,
} from "@/features/profile/hooks/queries";
import { queryKeys } from "@/lib/query/query-keys";
import { getProfileSettingsRoute, normalizeUsername } from "@/lib/routes";

type ProfilePageProps = {
  username: string;
};

const FPH_LOGO_WHITE_URL =
  "https://cdn.freediving.ph/images/fph-logo-white.png";

export default function ProfilePage({ username }: ProfilePageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useSession();
  const messageClickStartRef = useRef<number | null>(null);
  const normalizedUsername = normalizeUsername(username);
  const profileQuery = useProfileViewQuery(normalizedUsername);
  const mediaQuery = useProfileMediaInfiniteQuery(normalizedUsername);
  const divingQuery = useProfileDivingQuery(normalizedUsername);
  const badgesQuery = useProfileBadgesQuery(normalizedUsername);
  const savedHubQuery = useSavedHub(session.status === "signed_in");
  const saveUserMutation = useSaveUser();
  const unsaveUserMutation = useUnsaveUser();
  const currentProfileHref = useCurrentProfileHref();
  const openThreadMutation = useMutation({
    mutationFn: async ({ profileUserId }: { profileUserId: string }) => {
      const startedAt = currentMessagePerfTime();
      logMessagingPerf("profile_direct_thread_start");
      try {
        return await messagesApi.openDirectThread({
          targetUserId: profileUserId,
        });
      } finally {
        logMessagingPerf("profile_direct_thread_end", {
          durationMs: Math.round(currentMessagePerfTime() - startedAt),
        });
      }
    },
    onSuccess: (thread) => {
      queryClient.setQueryData(messageQueryKeys.thread(thread.id), thread);
      queryClient.invalidateQueries({ queryKey: messageQueryKeys.threads() });
      markThreadOpenStart(
        thread.id,
        "profile",
        messageClickStartRef.current ?? currentMessagePerfTime(),
      );
      router.push(`/messages/${thread.id}`);
    },
    onSettled: () => {
      messageClickStartRef.current = null;
    },
  });
  const isFollowPending =
    saveUserMutation.isPending || unsaveUserMutation.isPending;
  const mediaItems = mediaQuery.data?.pages.flatMap((page) => page.items) ?? [];

  if (profileQuery.isPending && !profileQuery.data) {
    return (
      <div className="mx-auto max-w-[935px]">
        <ProfileSkeleton />
      </div>
    );
  }

  if (!profileQuery.data) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-[935px] flex-col items-center justify-center px-4 py-10 text-center md:px-6">
        <Image
          src={FPH_LOGO_WHITE_URL}
          alt="Freediving Philippines"
          width={112}
          height={112}
          className="size-28 object-contain"
          priority
        />
        <h1 className="mt-8 text-2xl font-semibold text-foreground">
          Profile unavailable
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
          This public profile could not be loaded right now.
        </p>
      </div>
    );
  }

  const profile = profileQuery.data;
  const viewerRelationship = profile.viewerRelationship;
  const signedInUser = session.status === "signed_in" ? session.me : null;
  const isOwnerById = Boolean(
    signedInUser?.userId && profile.id && signedInUser.userId === profile.id,
  );
  const isOwnerByUsername = Boolean(
    signedInUser?.username &&
      profile.username &&
      normalizeUsername(signedInUser.username) ===
        normalizeUsername(profile.username),
  );
  const isOwner = Boolean(
    viewerRelationship?.isSelf ||
      viewerRelationship?.canEdit ||
      isOwnerById ||
      isOwnerByUsername,
  );
  const showVisitorActions = !isOwner && session.status !== "loading";
  const isFollowing = Boolean(
    viewerRelationship?.isFollowing ??
      savedHubQuery.data?.users?.some((saved) => saved.userId === profile.id),
  );
  const patchFollowingState = (nextIsFollowing: boolean) => {
    queryClient.setQueryData(
      queryKeys.profile.view(normalizedUsername),
      (current: typeof profile | undefined) => {
        if (!current) return current;
        return {
          ...current,
          counts: {
            ...current.counts,
            followers: Math.max(
              0,
              current.counts.followers + (nextIsFollowing ? 1 : -1),
            ),
          },
          viewerRelationship: current.viewerRelationship
            ? {
                ...current.viewerRelationship,
                isFollowing: nextIsFollowing,
              }
            : current.viewerRelationship,
        };
      },
    );
    queryClient.setQueryData(
      queryKeys.profile.saved(),
      (current: typeof savedHubQuery.data | undefined) => {
        if (!current) return current;
        const users = current.users ?? [];
        const targetUserId = profile.id;
        const existingIndex = users.findIndex(
          (saved) => saved.userId === targetUserId,
        );
        if (nextIsFollowing) {
          if (existingIndex >= 0) return current;
          return {
            ...current,
            users: [
              ...users,
              {
                userId: targetUserId,
                username: profile.username,
                displayName: profile.displayName ?? profile.username,
                emailVerified: false,
                phoneVerified: false,
                avatarUrl: profile.avatarUrl,
                homeArea: profile.locationText,
                certLevel: undefined,
                buddyCount: 0,
                reportCount: 0,
                savedAt: new Date().toISOString(),
              },
            ],
          };
        }
        if (existingIndex === -1) return current;
        return {
          ...current,
          users: users.filter((saved) => saved.userId !== targetUserId),
        };
      },
    );
  };

  return (
    <div className="mx-auto max-w-[935px]">
      <div className="space-y-6 md:space-y-8">
        <ProfileHeader
          profile={profile}
          isOwner={isOwner}
          showVisitorActions={showVisitorActions}
          isFollowing={isFollowing}
          badgeCategorySummaries={badgesQuery.data?.categorySummaries ?? []}
          settingsHref={
            currentProfileHref === `/${normalizedUsername}`
              ? getProfileSettingsRoute(normalizedUsername)
              : null
          }
          onFollowClick={() => {
            if (isFollowPending) return;
            if (isFollowing) {
              unsaveUserMutation.mutate(profile.id, {
                onSuccess: () => patchFollowingState(false),
              });
              return;
            }
            saveUserMutation.mutate(profile.id, {
              onSuccess: () => patchFollowingState(true),
            });
          }}
          isFollowPending={isFollowPending}
          onMessageClick={() => {
            messageClickStartRef.current = currentMessagePerfTime();
            logMessagingPerf("profile_message_click", {
              targetKnown: Boolean(profile.id),
            });
            openThreadMutation.mutate({
              profileUserId: profile.id,
            });
          }}
          isMessagePending={openThreadMutation.isPending}
        />
        <ProfileBucketList items={[]} />
        <ProfileTabs
          mediaItems={mediaItems}
          isLoadingMedia={mediaQuery.isPending && mediaItems.length === 0}
          hasNextPage={Boolean(mediaQuery.hasNextPage)}
          isFetchingNextPage={mediaQuery.isFetchingNextPage}
          onLoadMore={() => {
            void mediaQuery.fetchNextPage();
          }}
          username={profileQuery.data.username}
          displayName={profile.displayName ?? profile.username}
          avatarUrl={profile.avatarUrl}
          diving={divingQuery.data}
          isLoadingDiving={divingQuery.isPending}
          badges={badgesQuery.data?.badges ?? []}
          autoStats={badgesQuery.data?.autoStats ?? []}
          isOwner={isOwner}
        />
      </div>
    </div>
  );
}
