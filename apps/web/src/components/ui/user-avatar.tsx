import { cn } from "@/lib/utils";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type UserAvatarSize = "xs" | "sm" | "default" | "lg" | "xl";

const sizeClassMap: Record<UserAvatarSize, string> = {
  xs: "size-6",
  sm: "size-8",
  default: "size-10",
  lg: "size-24",
  xl: "size-30",
};

const fallbackTextClassMap: Record<UserAvatarSize, string> = {
  xs: "text-[10px]",
  sm: "text-xs",
  default: "text-sm",
  lg: "text-lg",
  xl: "text-xl",
};

const getInitials = (displayName: string) =>
  displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment.charAt(0).toUpperCase())
    .join("") || "U";

type UserAvatarProps = {
  src?: string | null;
  displayName?: string | null;
  size?: UserAvatarSize;
  className?: string;
  fallbackClassName?: string;
};

export function UserAvatar({
  src,
  displayName,
  size = "default",
  className,
  fallbackClassName,
}: UserAvatarProps) {
  const name = displayName?.trim() || "User";

  return (
    <Avatar
      className={cn(
        "border border-border/70 bg-muted",
        sizeClassMap[size],
        className,
      )}
    >
      <AvatarImage src={src ?? ""} alt={name} />
      <AvatarFallback
        className={cn(fallbackTextClassMap[size], fallbackClassName)}
      >
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
