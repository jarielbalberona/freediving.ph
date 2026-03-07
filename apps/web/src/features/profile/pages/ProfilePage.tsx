"use client";

import { AlertCircle } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { useSession } from "@/features/auth/session";
import { useCurrentProfileHref } from "@/features/profile/hooks/use-current-profile-href";
import { ProfileHeader } from "@/features/profile/components/ProfileHeader";
import { messagesApi } from "@/features/messages/api/messages";
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
  useProfilePostsQuery,
  usePublicProfileQuery,
} from "@/features/profile/hooks/queries";
import { normalizeUsername } from "@/lib/routes";

type ProfilePageProps = {
  username: string;
};

export default function ProfilePage({ username }: ProfilePageProps) {
  const router = useRouter();
  const session = useSession();
  const { user } = useUser();
  const normalizedUsername = normalizeUsername(username);
  const profileQuery = usePublicProfileQuery(normalizedUsername);
  const postsQuery = useProfilePostsQuery(normalizedUsername);
  const bucketListQuery = useProfileBucketListQuery(normalizedUsername);
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
      return messagesApi.openDirectThread({ targetUserId: profileUserId });
    },
    onSuccess: (thread) => {
      router.push(`/messages/${thread.id}`);
    },
  });
  const isFollowPending =
    saveUserMutation.isPending || unsaveUserMutation.isPending;

  const isFollowing = Boolean(
    savedHubQuery.data?.users?.some(
      (saved) => saved.userId === profileQuery.data?.id,
    ),
  );

  if (profileQuery.isPending && !profileQuery.data) {
    return (
      <div className="mx-auto max-w-[935px]">
        <ProfileSkeleton />
      </div>
    );
  }

  if (!profileQuery.data) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-[935px] items-center justify-center px-4 py-10 md:px-6">
        <div className="flex max-w-md flex-col items-center gap-3 rounded-[2rem] border border-dashed border-border bg-muted/20 px-8 py-10 text-center">
          <AlertCircle className="size-8 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-lg font-semibold text-foreground">
              Profile unavailable
            </p>
            <p className="text-sm text-muted-foreground">
              This public profile could not be loaded.
            </p>
          </div>
        </div>
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
          settingsHref={currentProfileHref === `/${normalizedUsername}` ? "/profile/settings" : null}
          onFollowClick={() => {
            if (isFollowPending) return;
            if (isFollowing) {
              unsaveUserMutation.mutate(profileQuery.data.id);
              return;
            }
            saveUserMutation.mutate(profileQuery.data.id);
          }}
          isFollowPending={isFollowPending}
          onMessageClick={() =>
            openThreadMutation.mutate({
              profileUserId: profileQuery.data.id,
            })
          }
          isMessagePending={openThreadMutation.isPending}
        />
        <ProfileBucketList items={bucketListQuery.data ?? []} />
        <ProfileTabs
          posts={postsQuery.data ?? []}
          isLoadingPosts={postsQuery.isPending && !postsQuery.data}
          username={profileQuery.data.username}
          displayName={profileQuery.data.displayName}
          avatarUrl={profileQuery.data.avatarUrl}
        />
      </div>
    </div>
  );
}
