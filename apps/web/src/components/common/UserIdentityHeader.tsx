import type { ReactNode } from "react";

import { UsernameLink } from "@/components/common/UsernameLink";
import { UserAvatar } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";

type UserIdentityHeaderProps = {
  displayName?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  showProfileImage?: boolean;
  usernameDisabled?: boolean;
  usernameFallback?: string;
  location?: ReactNode;
  time?: ReactNode;
  metadata?: ReactNode[];
  className?: string;
  avatarClassName?: string;
  contentClassName?: string;
  displayNameClassName?: string;
  metadataClassName?: string;
};

export function UserIdentityHeader({
  displayName,
  username,
  avatarUrl,
  showProfileImage = true,
  usernameDisabled = false,
  usernameFallback = "Unknown",
  location,
  time,
  metadata = [],
  className,
  avatarClassName,
  contentClassName,
  displayNameClassName,
  metadataClassName,
}: UserIdentityHeaderProps) {
  const name = displayName?.trim() || "Diver";
  const metadataItems = [
    <UsernameLink
      key="username"
      username={username}
      className="truncate"
      disabled={usernameDisabled}
      fallback={usernameFallback}
    />,
    location,
    ...metadata,
    time,
  ].filter(Boolean);

  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <UserAvatar
        src={showProfileImage ? avatarUrl : undefined}
        displayName={name}
        size="sm"
        className={avatarClassName}
      />
      <div className={cn("min-w-0 space-y-1", contentClassName)}>
        <p
          className={cn(
            "min-w-0 truncate text-sm font-semibold text-foreground",
            displayNameClassName,
          )}
        >
          {name}
        </p>
        {metadataItems.length > 0 ? (
          <div
            className={cn(
              "flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground",
              metadataClassName,
            )}
          >
            {metadataItems.map((item, index) => (
              <span
                key={`identity-metadata-${index + 1}`}
                className="inline-flex min-w-0 items-center gap-1.5"
              >
                {index > 0 ? (
                  <span className="shrink-0" aria-hidden="true">
                    ·
                  </span>
                ) : null}
                <span className="min-w-0 truncate">{item}</span>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
