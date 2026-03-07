import Link from "next/link";

import { canLinkToProfileUsername, getProfileRoute } from "@/lib/routes";
import { cn } from "@/lib/utils";

interface UsernameLinkProps {
  username?: string | null;
  className?: string;
  disabled?: boolean;
  fallback?: string;
}

export function UsernameLink({
  username,
  className,
  disabled = false,
  fallback = "Unknown",
}: UsernameLinkProps) {
  const value = username?.trim() ?? "";
  if (!value) {
    return <span className={className}>{fallback}</span>;
  }

  const shouldLink = !disabled && canLinkToProfileUsername(value);
  if (!shouldLink) {
    return <span className={className}>{value}</span>;
  }

  return (
    <Link
      href={getProfileRoute(value)}
      className={cn(className, "hover:underline")}
    >
      @{value}
    </Link>
  );
}
