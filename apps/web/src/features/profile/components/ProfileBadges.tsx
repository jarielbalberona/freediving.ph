"use client";

import type { BadgeCategory, UserBadge } from "@freediving.ph/types";
import {
  Award,
  Compass,
  Medal,
  Trophy,
  Waves,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type SyntheticEvent, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ProfileTabHeader } from "@/features/profile/components/ProfileTabHeader";

type ProfileBadgesProps = {
  badges: UserBadge[];
  autoStats: UserBadge[];
  isOwner: boolean;
};

type BadgeCategoryConfig = {
  category: BadgeCategory;
  title: string;
  Icon: LucideIcon;
};

const badgeCategoryOrder: BadgeCategoryConfig[] = [
  { category: "personal_best", title: "Performance Marks", Icon: Trophy },
  { category: "certification", title: "Credential Seals", Icon: Medal },
  { category: "experience", title: "Field Experience", Icon: Waves },
  { category: "community_role", title: "Leadership Crests", Icon: Award },
  { category: "auto_stat", title: "Explorer Stamps", Icon: Compass },
];

export function ProfileBadges({
  badges,
  autoStats,
  isOwner,
}: ProfileBadgesProps) {
  const items = [...badges, ...autoStats];
  const groupedItems = badgeCategoryOrder
    .map((config) => ({
      ...config,
      items: items.filter((item) => item.category === config.category),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <section className="space-y-5">
      <ProfileTabHeader
        icon={<Award className="h-4 w-4" />}
        title="Badges & Credentials"
        subtitle="Certifications, experience, community roles, and personal bests."
        action={
          isOwner ? (
            <Link
              href="/management/badges"
              className={buttonVariants({ size: "sm", variant: "outline" })}
            >
              Manage
            </Link>
          ) : null
        }
      />
      {groupedItems.length > 0 ? (
        <div className="space-y-6">
          {groupedItems.map(({ category, title, Icon, items }) => (
            <section key={category} className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <h3 className="truncate text-sm font-semibold text-foreground">
                    {title}
                  </h3>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1 sm:grid-cols-4 lg:grid-cols-6">
                {items.map((item) => (
                  <ProfileBadgeCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center">
          <p className="text-sm font-medium text-foreground">No badges yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Badges, credentials, and milestones will appear here.
          </p>
        </div>
      )}
    </section>
  );
}

function ProfileBadgeCard({ item }: { item: UserBadge }) {
  const badgeName = item.template.name;
  const [previewOpen, setPreviewOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const imageSrc = normalizeBadgeImageSrc(item.template.badgeImageUrl);
  const issuer = badgeIssuer(item);

  return (
    <article className="flex min-h-[132px] flex-col px-1 py-1">
      <div className="flex justify-center">
        <div className="flex h-14 w-14 items-center justify-center">
          {imageSrc && !imageFailed ? (
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
              <DialogTrigger
                render={
                  <button
                    type="button"
                    className="cursor-zoom-in rounded-full"
                    aria-label={`Open ${badgeName} badge image`}
                    title="Open image"
                  />
                }
              >
                <Image
                  src={imageSrc}
                  alt={`${badgeName} badge logo`}
                  width={48}
                  height={48}
                  sizes="56px"
                  className="h-22 w-22 object-contain"
                  onError={(event: SyntheticEvent<HTMLImageElement>) => {
                    event.currentTarget.style.display = "none";
                    setImageFailed(true);
                  }}
                />
              </DialogTrigger>
              <DialogContent className="sm:max-w-3xl!">
                <DialogHeader>
                  <DialogTitle className="sr-only">
                    {badgeName} badge image
                  </DialogTitle>
                </DialogHeader>
                <div className="flex items-center justify-center">
                  <Image
                    src={imageSrc}
                    alt={`${badgeName} badge logo full view`}
                    width={960}
                    height={960}
                    sizes="(max-width: 768px) 90vw, 60vw"
                    className="h-auto max-h-[80vh] w-auto max-w-full object-contain"
                  />
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <Award
              aria-label={`${badgeName} badge logo unavailable`}
              className="h-6 w-6 text-muted-foreground"
            />
          )}
        </div>
      </div>

      <div className="mt-2 min-w-0 flex-1 space-y-1 text-center">
        <p className="line-clamp-2 text-xs font-normal leading-4 text-foreground">
          {badgeName}
        </p>
        {item.displayValue ? (
          <div className="flex justify-center">
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
              {item.displayValue}
            </Badge>
          </div>
        ) : null}
        {issuer ? (
          <p className="truncate text-xs text-muted-foreground">{issuer}</p>
        ) : null}
      </div>
    </article>
  );
}

function normalizeBadgeImageSrc(value?: string): string {
  const src = value?.trim() ?? "";
  if (!src) return "";
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  return src.startsWith("/") ? src : `/${src}`;
}

function badgeIssuer(item: UserBadge): string {
  if (item.referenceLabel && item.referenceValue) {
    return `${item.referenceLabel}: ${item.referenceValue}`;
  }
  return item.referenceLabel ?? item.referenceValue ?? "";
}
