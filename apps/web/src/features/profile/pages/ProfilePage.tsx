"use client";

import { useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
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
import { DiveSpotHighlights } from "@/features/profile/components/DiveSpotHighlights";
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
  useProfileBucketListQuery,
  useProfileDivingQuery,
  usePublicProfileQuery,
} from "@/features/profile/hooks/queries";
import { getProfileSettingsRoute, normalizeUsername } from "@/lib/routes";

type ProfilePageProps = {
  username: string;
};

const FPH_LOGO_WHITE_URL = "https://cdn.freediving.ph/images/fph-logo-white.png";

export default function ProfilePage({ username }: ProfilePageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useSession();
  const { user } = useUser();
  const messageClickStartRef = useRef<number | null>(null);
  const normalizedUsername = normalizeUsername(username);
  const profileQuery = usePublicProfileQuery(normalizedUsername);
  const mediaQuery = useProfileMediaInfiniteQuery(normalizedUsername);
  const bucketListQuery = useProfileBucketListQuery(normalizedUsername);
  const divingQuery = useProfileDivingQuery(normalizedUsername);
  const savedHubQuery = useSavedHub(session.status === "signed_in");
  const saveUserMutation = useSaveUser();
  const unsaveUserMutation = useUnsaveUser();
  const currentProfileHref = useCurrentProfileHref();
  const viewerUsername = session.me?.username ?? user?.username ?? null;
  const isOwner =
    session.status === "signed_in" &&
    viewerUsername != null &&
    normalizeUsername(viewerUsername) === normalizedUsername;
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

  const isFollowing = Boolean(
    savedHubQuery.data?.users?.some(
      (saved) => saved.userId === profileQuery.data?.id,
    ),
  );
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
        <p className="mt-2 text-sm font-medium text-foreground">
          Sign in to view this profile.
        </p>
        <Link href="/sign-in" className={buttonVariants({ className: "mt-6" })}>
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[935px]">
      <div className="space-y-6 md:space-y-8">
        <ProfileHeader
          profile={profileQuery.data}
          isOwner={isOwner}
          canMessage={session.status === "signed_in"}
          isFollowing={isFollowing}
          settingsHref={
            currentProfileHref === `/${normalizedUsername}`
              ? getProfileSettingsRoute(normalizedUsername)
              : null
          }
          onFollowClick={() => {
            if (isFollowPending) return;
            if (isFollowing) {
              unsaveUserMutation.mutate(profileQuery.data.id);
              return;
            }
            saveUserMutation.mutate(profileQuery.data.id);
          }}
          isFollowPending={isFollowPending}
          onMessageClick={() => {
            messageClickStartRef.current = currentMessagePerfTime();
            logMessagingPerf("profile_message_click", {
              targetKnown: Boolean(profileQuery.data.id),
            });
            openThreadMutation.mutate({
              profileUserId: profileQuery.data.id,
            });
          }}
          isMessagePending={openThreadMutation.isPending}
        />
        <DiveSpotHighlights
          username={profileQuery.data.username}
          displayName={profileQuery.data.displayName}
          avatarUrl={profileQuery.data.avatarUrl}
        />
        <ProfileBucketList items={bucketListQuery.data ?? []} />
        <ProfileTabs
          mediaItems={mediaItems}
          isLoadingMedia={mediaQuery.isPending && mediaItems.length === 0}
          hasNextPage={Boolean(mediaQuery.hasNextPage)}
          isFetchingNextPage={mediaQuery.isFetchingNextPage}
          onLoadMore={() => {
            void mediaQuery.fetchNextPage();
          }}
          username={profileQuery.data.username}
          displayName={profileQuery.data.displayName}
          avatarUrl={profileQuery.data.avatarUrl}
          diving={divingQuery.data}
          isLoadingDiving={divingQuery.isPending}
          isOwner={isOwner}
        />
      </div>
    </div>
  );
}
