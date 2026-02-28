"use client";

import { AlertCircle } from "lucide-react";
import { useUser } from "@clerk/nextjs";

import { useSession } from "@/features/auth/session";
import { useCurrentProfileHref } from "@/features/profile/hooks/use-current-profile-href";
import { ProfileHeader } from "@/features/profile/components/ProfileHeader";
import { ProfileHighlights } from "@/features/profile/components/ProfileHighlights";
import { ProfileSkeleton } from "@/features/profile/components/ProfileSkeleton";
import { ProfileTabs } from "@/features/profile/components/ProfileTabs";
import {
  useProfilePostsQuery,
  usePublicProfileQuery,
} from "@/features/profile/hooks/queries";
import { normalizeUsername } from "@/lib/routes";

type ProfilePageProps = {
  username: string;
};

export default function ProfilePage({ username }: ProfilePageProps) {
  const session = useSession();
  const { user } = useUser();
  const normalizedUsername = normalizeUsername(username);
  const profileQuery = usePublicProfileQuery(normalizedUsername);
  const postsQuery = useProfilePostsQuery(normalizedUsername);
  const currentProfileHref = useCurrentProfileHref();
  const viewerUsername = session.me?.username ?? user?.username ?? null;
  const isOwner =
    session.status === "signed_in" &&
    viewerUsername != null &&
    normalizeUsername(viewerUsername) === normalizedUsername;

  if (profileQuery.isPending && !profileQuery.data) {
    return (
      <div className="mx-auto max-w-[935px] px-4 py-6 md:px-6 md:py-8">
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
    <div className="mx-auto max-w-[935px] px-4 py-6 md:px-6 md:py-8">
      <div className="space-y-6 md:space-y-8">
        <ProfileHeader
          profile={profileQuery.data}
          isOwner={isOwner}
          canMessage={session.status === "signed_in"}
          settingsHref={currentProfileHref === `/${normalizedUsername}` ? "/profile/settings" : null}
        />
        <ProfileHighlights highlights={profileQuery.data.highlights} />
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
