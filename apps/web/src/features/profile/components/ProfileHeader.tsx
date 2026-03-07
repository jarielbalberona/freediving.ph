import Link from "next/link";
import { Settings2 } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { PublicProfile } from "@/features/profile/types";
import { cn } from "@/lib/utils";

type ProfileHeaderProps = {
  profile: PublicProfile;
  isOwner: boolean;
  canMessage: boolean;
  isFollowing?: boolean;
  settingsHref?: string | null;
  onFollowClick?: () => void;
  isFollowPending?: boolean;
  onMessageClick?: () => void;
  isMessagePending?: boolean;
};

const formatCount = (value: number): string => new Intl.NumberFormat().format(value);

function ProfileStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 text-center md:flex-row md:gap-1 md:text-left">
      <span className="text-base font-semibold text-foreground">
        {formatCount(value)}
      </span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

function ActionButtons({
  canMessage,
  isFollowing,
  onFollowClick,
  isFollowPending,
  onMessageClick,
  isMessagePending,
}: {
  canMessage: boolean;
  isFollowing?: boolean;
  onFollowClick?: () => void;
  isFollowPending?: boolean;
  onMessageClick?: () => void;
  isMessagePending?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant={isFollowing ? "outline" : "default"}
        disabled={!canMessage || isFollowPending}
        onClick={onFollowClick}
        size="sm"
      >
        {isFollowPending
          ? "Saving..."
          : isFollowing
            ? "Following"
            : "Follow"}
      </Button>
      <Button
        variant="outline"
        disabled={!canMessage || isMessagePending}
        onClick={onMessageClick}
        size="sm"
      >
        {isMessagePending ? "Opening..." : "Message"}
      </Button>
    </div>
  );
}

export function ProfileHeader({
  profile,
  isOwner,
  canMessage,
  isFollowing,
  settingsHref,
  onFollowClick,
  isFollowPending = false,
  onMessageClick,
  isMessagePending = false,
}: ProfileHeaderProps) {
  return (
    <section className="space-y-6 px-4">
      <div className="grid gap-6 md:hidden">
        <div className="grid grid-cols-[auto_1fr] items-center gap-5">
          <UserAvatar
            src={profile.avatarUrl}
            displayName={profile.displayName}
            size="lg"
          />
          <div className="grid grid-cols-3 gap-3">
            <ProfileStat label="posts" value={profile.counts.posts} />
            <ProfileStat label="followers" value={profile.counts.followers} />
            <ProfileStat label="following" value={profile.counts.following} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-foreground">
                {profile.username}
              </h1>
              {isOwner ? (
                <Link
                  href={settingsHref ?? "/profile/settings"}
                  className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                  aria-label="Edit profile"
                  title="Edit profile"
                >
                  <Settings2 className="size-4" />
                </Link>
              ) : null}
            </div>
            <p className="text-base font-medium text-foreground">
              {profile.displayName}
            </p>
            {profile.bio ? (
              <p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">
                {profile.bio}
              </p>
            ) : null}
          </div>
          {!isOwner ? (
            <ActionButtons
              canMessage={canMessage}
              isFollowing={isFollowing}
              onFollowClick={onFollowClick}
              isFollowPending={isFollowPending}
              onMessageClick={onMessageClick}
              isMessagePending={isMessagePending}
            />
          ) : null}
        </div>
      </div>

      <div className="hidden md:grid md:grid-cols-[220px_minmax(0,1fr)] md:items-start md:gap-10">
        <div className="flex justify-center ">
          <UserAvatar
            src={profile.avatarUrl}
            displayName={profile.displayName}
            size="xl"
          />
        </div>

        <div className="space-y-5 pt-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              @{profile.username}
            </h1>
            {isOwner ? (
              <Link
                href={settingsHref ?? "/profile/settings"}
                className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                aria-label="Edit profile"
                title="Edit profile"
              >
                <Settings2 className="size-4" />
              </Link>
            ) : (
              <ActionButtons
                canMessage={canMessage}
                isFollowing={isFollowing}
                onFollowClick={onFollowClick}
                isFollowPending={isFollowPending}
                onMessageClick={onMessageClick}
                isMessagePending={isMessagePending}
              />
            )}
          </div>

          <div className="flex flex-wrap gap-8">
            <ProfileStat label="posts" value={profile.counts.posts} />
            <ProfileStat label="followers" value={profile.counts.followers} />
            <ProfileStat label="following" value={profile.counts.following} />
          </div>

          <div className="space-y-2">
            <p className="text-base font-semibold text-foreground">
              {profile.displayName}
            </p>
            {profile.bio ? (
              <p
                className={cn(
                  "max-w-2xl whitespace-pre-line text-sm leading-6 text-muted-foreground",
                )}
              >
                {profile.bio}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
