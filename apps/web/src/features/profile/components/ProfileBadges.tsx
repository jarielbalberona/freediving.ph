"use client";

import type { UserBadge } from "@freediving.ph/types";
import { BadgeCheck, CircleAlert, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

type ProfileBadgesProps = {
  badges: UserBadge[];
  autoStats: UserBadge[];
  isOwner: boolean;
};

export function ProfileBadges({
  badges,
  autoStats,
  isOwner,
}: ProfileBadgesProps) {
  const items = [...badges, ...autoStats];

  return (
    <section className="space-y-3 px-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">
          Badges & Credentials
        </h2>
        {isOwner ? (
          <Link
            href="/management/badges"
            className={buttonVariants({ size: "sm", variant: "outline" })}
          >
            Manage
          </Link>
        ) : null}
      </div>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <ProfileBadgePill key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {isOwner
            ? "Add personal bests, certifications, and community roles."
            : "No visible badges yet."}
        </p>
      )}
    </section>
  );
}

function ProfileBadgePill({ item }: { item: UserBadge }) {
  const isVerified = item.verificationStatus === "verified";
  const isRejected = item.verificationStatus === "rejected";
  const label = item.displayValue
    ? `${item.template.name} • ${item.displayValue}`
    : item.template.name;

  return (
    <Badge variant={isVerified ? "secondary" : "outline"} className="gap-1.5">
      {item.isSystemVerified ? (
        <ShieldCheck className="size-3.5" />
      ) : isVerified ? (
        <BadgeCheck className="size-3.5" />
      ) : isRejected ? (
        <CircleAlert className="size-3.5" />
      ) : null}
      {label}
    </Badge>
  );
}
