import Link from "next/link";
import { Settings2 } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import type { PublicProfile } from "@/features/profile/types";
import { cn } from "@/lib/utils";

type ProfileHeaderProps = {
  profile: PublicProfile;
  isOwner: boolean;
  canMessage: boolean;
  settingsHref?: string | null;
};

const formatCount = (value: number): string => new Intl.NumberFormat().format(value);

const getInitials = (displayName: string): string =>
  displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment.charAt(0).toUpperCase())
    .join("") || "FP";

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
  isOwner,
  canMessage,
  settingsHref,
}: {
  isOwner: boolean;
  canMessage: boolean;
  settingsHref?: string | null;
}) {
  if (isOwner) {
    return (
      <div className="flex flex-wrap gap-2">
        <Link
          href={settingsHref ?? "/profile/settings"}
          className={buttonVariants({ variant: "outline" })}
        >
          Edit profile
        </Link>
        <Link
          href={settingsHref ?? "/profile/settings"}
          className={buttonVariants({ variant: "outline", size: "icon-sm" })}
          aria-label="Profile settings"
          title="Profile settings"
        >
          <Settings2 className="size-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button disabled={!canMessage}>Follow</Button>
      <Button variant="outline" disabled={!canMessage}>
        Message
      </Button>
    </div>
  );
}

export function ProfileHeader({
  profile,
  isOwner,
  canMessage,
  settingsHref,
}: ProfileHeaderProps) {
  return (
    <section className="space-y-6 px-4">
      <div className="grid gap-6 md:hidden">
        <div className="grid grid-cols-[auto_1fr] items-center gap-5">
          <Avatar className="size-24 border border-border/70 bg-muted">
            <AvatarImage src={profile.avatarUrl} alt={profile.displayName} />
            <AvatarFallback>{getInitials(profile.displayName)}</AvatarFallback>
          </Avatar>
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
                  aria-label="Profile settings"
                  title="Profile settings"
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
          <ActionButtons
            isOwner={isOwner}
            canMessage={canMessage}
            settingsHref={settingsHref}
          />
        </div>
      </div>

      <div className="hidden md:grid md:grid-cols-[220px_minmax(0,1fr)] md:items-start md:gap-10">
        <div className="flex justify-center md:justify-start">
          <Avatar className="size-40 border border-border/70 bg-muted">
            <AvatarImage src={profile.avatarUrl} alt={profile.displayName} />
            <AvatarFallback className="text-2xl">
              {getInitials(profile.displayName)}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="space-y-5 pt-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {profile.username}
            </h1>
            <ActionButtons
              isOwner={isOwner}
              canMessage={canMessage}
              settingsHref={settingsHref}
            />
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
