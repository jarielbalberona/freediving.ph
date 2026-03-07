import Link from "next/link";

import { getProfileRoute } from "@/lib/routes";

import { UserAvatar } from "./user-avatar";

type UserAvatarDetailProps = {
  username: string;
  src?: string | null;
  displayName?: string | null;
  hideDisplayName?: boolean;
};

export function UserAvatarDetail({
  username,
  src,
  displayName,
  hideDisplayName = false,
}: UserAvatarDetailProps) {
  const showDisplayName = displayName && !hideDisplayName;

  return (
    <div className="flex items-center gap-2">
      <UserAvatar
        src={src ?? ""}
        displayName={displayName ?? username}
        size="sm"
      />
      <div className="min-w-0 leading-none">
        <Link
          href={getProfileRoute(username)}
          className="truncate text-sm font-semibold hover:text-foreground"
        >
          @{username}
        </Link>
        {showDisplayName ? (
          <p className="truncate text-xs text-muted-foreground">
            {displayName}
          </p>
        ) : null}
      </div>
    </div>
  );
}
