import type { ComponentType, ReactNode } from "react";
import { ImageIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type IconComponent = ComponentType<{ className?: string }>;

type EntityAvatarProps = {
  src?: string | null;
  label: string;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
  icon?: IconComponent;
};

export function EntityAvatar({
  src,
  label,
  className,
  imageClassName,
  fallbackClassName,
  icon: Icon,
}: EntityAvatarProps) {
  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-lg border border-border/70 bg-background text-xs font-semibold text-muted-foreground shadow-sm",
        className,
      )}
    >
      {src ? (
        <img
          src={src}
          alt={`${label} logo`}
          className={cn("h-full w-full object-cover", imageClassName)}
        />
      ) : Icon ? (
        <Icon className={cn("h-4 w-4 text-muted-foreground", fallbackClassName)} />
      ) : (
        <span className={fallbackClassName}>{entityInitials(label)}</span>
      )}
    </div>
  );
}

type EntityCoverProps = {
  src?: string | null;
  label: string;
  className?: string;
  imageClassName?: string;
  fallback?: ReactNode;
};

export function EntityCover({
  src,
  label,
  className,
  imageClassName,
  fallback,
}: EntityCoverProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border/70 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--muted))_0,hsl(var(--background))_42%,hsl(var(--muted))_100%)]",
        className,
      )}
    >
      {src ? (
        <img
          src={src}
          alt={`${label} cover photo`}
          className={cn("h-full w-full object-cover", imageClassName)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center px-4 text-center text-xs text-muted-foreground">
          {fallback ?? (
            <span className="inline-flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Cover photo coming soon.
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function entityInitials(label: string) {
  const parts = label
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) return "?";

  return parts.map((part) => part[0]?.toUpperCase()).join("");
}
