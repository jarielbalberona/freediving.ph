"use client";

import type {
  ProfileDivePresence,
  ProfileDiveSiteAffinity,
  ProfileDivingResponse,
  ProfileMediaItem,
  UserBadge,
} from "@freediving.ph/types";
import {
  Award,
  CalendarClock,
  Grid3X3,
  HeartHandshake,
  IdCard,
  MapPinned,
  MessageCircle,
  Route,
  Waves,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileBadges } from "@/features/profile/components/ProfileBadges";
import { ProfileDiveMap } from "@/features/profile/components/ProfileDiveMap";
import { ProfileGrid } from "@/features/profile/components/ProfileGrid";
import { ProfileJourney } from "@/features/profile/components/ProfileJourney";
import { ProfilePassport } from "@/features/profile/components/ProfilePassport";
import { ProfileTabHeader } from "@/features/profile/components/ProfileTabHeader";
import { cn } from "@/lib/utils";

type ProfileTabsProps = {
  mediaItems: ProfileMediaItem[];
  isLoadingMedia: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  username: string;
  displayName: string;
  avatarUrl?: string;
  diving?: ProfileDivingResponse;
  isLoadingDiving: boolean;
  badges: UserBadge[];
  autoStats: UserBadge[];
  isOwner: boolean;
};

type ProfileTabValue =
  | "posts"
  | "badges"
  | "diving"
  | "dive-memories"
  | "dive-journey"
  | "dive-passport";

const profileTabValues: ProfileTabValue[] = [
  "posts",
  "badges",
  "diving",
  "dive-memories",
  "dive-journey",
  "dive-passport",
];

const profileTabItems: Array<{
  value: ProfileTabValue;
  label: string;
  Icon: LucideIcon;
}> = [
  { value: "posts", label: "Posts", Icon: Grid3X3 },
  { value: "badges", label: "Badges", Icon: Award },
  { value: "diving", label: "Diving", Icon: Waves },
  { value: "dive-memories", label: "Dive Memories", Icon: HeartHandshake },
  { value: "dive-journey", label: "Dive Journey", Icon: Route },
  { value: "dive-passport", label: "Dive Passport", Icon: IdCard },
];

const isProfileTabValue = (value: string | null): value is ProfileTabValue =>
  profileTabValues.includes(value as ProfileTabValue);

const profileTabTriggerClassName =
  "rounded-none border-x-0 border-t-0 border-b-2 border-transparent bg-transparent px-2 text-muted-foreground after:bg-primary hover:bg-transparent hover:text-foreground data-[active]:bg-transparent data-[active]:text-foreground";

export function ProfileTabs({
  mediaItems,
  isLoadingMedia,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  username,
  displayName,
  avatarUrl,
  diving,
  isLoadingDiving,
  badges,
  autoStats,
  isOwner,
}: ProfileTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: ProfileTabValue = isProfileTabValue(tabParam)
    ? tabParam
    : "posts";

  const setTab = (value: string | null) => {
    const nextTab: ProfileTabValue = isProfileTabValue(value) ? value : "posts";
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("tab", nextTab);
    const suffix = nextParams.toString();
    router.replace(`${pathname}${suffix ? `?${suffix}` : ""}`, {
      scroll: false,
    });
  };

  return (
    <section className="space-y-0">
      <Tabs value={activeTab} onValueChange={setTab} className="gap-4">
        <TabsList
          variant="line"
          className="mx-auto grid h-12! w-full max-w-3xl grid-cols-6 border-b border-border/70 px-2"
        >
          {profileTabItems.map(({ value, label, Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              aria-label={label}
              title={label}
              className={cn(
                profileTabTriggerClassName,
                activeTab === value && "border-primary text-foreground",
              )}
            >
              <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span className="sr-only">{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="posts" className="px-1">
          <ProfilePostsTab
            mediaItems={mediaItems}
            isLoadingMedia={isLoadingMedia}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onLoadMore={onLoadMore}
            username={username}
            displayName={displayName}
            avatarUrl={avatarUrl}
          />
        </TabsContent>
        <TabsContent value="badges" className="px-2">
          <ProfileBadges
            badges={badges}
            autoStats={autoStats}
            isOwner={isOwner}
          />
        </TabsContent>
        <TabsContent value="diving" className="px-2">
          <ProfileDivingTab
            data={diving}
            isLoading={isLoadingDiving}
            isOwner={isOwner}
          />
        </TabsContent>
        <TabsContent value="dive-memories" className="px-2">
          <ProfileDiveMap username={username} isOwner={isOwner} />
        </TabsContent>
        <TabsContent value="dive-journey" className="px-2">
          <ProfileJourney username={username} isOwner={isOwner} />
        </TabsContent>
        <TabsContent value="dive-passport" className="px-2">
          <ProfilePassport username={username} isOwner={isOwner} />
        </TabsContent>
      </Tabs>
    </section>
  );
}

function ProfilePostsTab({
  mediaItems,
  isLoadingMedia,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  username,
  displayName,
  avatarUrl,
}: Omit<
  ProfileTabsProps,
  "diving" | "isLoadingDiving" | "badges" | "autoStats" | "isOwner"
>) {
  return (
    <ProfileGrid
      items={mediaItems}
      isLoading={isLoadingMedia}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      onLoadMore={onLoadMore}
      username={username}
      displayName={displayName}
      avatarUrl={avatarUrl}
    />
  );
}

function ProfileDivingTab({
  data,
  isLoading,
  isOwner,
}: {
  data?: ProfileDivingResponse;
  isLoading: boolean;
  isOwner: boolean;
}) {
  if (isLoading && !data) {
    return (
      <div className="space-y-4">
        <StatusCard title="Loading Dive Presence" />
        <StatusCard title="Loading Dive Sites" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ProfileTabHeader
        title="Diving"
        subtitle="Presence and dive sites."
        icon={<Waves className="h-4 w-4" />}
      />
      <ProfileDivePresenceSection
        items={data?.presences ?? []}
        isOwner={isOwner}
      />
      <ProfileDiveSitesSection
        items={data?.affinities ?? []}
        isOwner={isOwner}
      />
    </div>
  );
}

function ProfileDivePresenceSection({
  items,
  isOwner,
}: {
  items: ProfileDivePresence[];
  isOwner: boolean;
}) {
  return (
    <section className="space-y-3">
      <SectionHeader
        icon={<CalendarClock className="h-4 w-4" />}
        title="Dive Presence"
      />
      {items.length > 0 ? (
        <DivingList>
          {items.map((item) => (
            <ProfileDivePresenceItem key={item.id} item={item} />
          ))}
        </DivingList>
      ) : (
        <EmptyDivingState
          title={
            isOwner
              ? "You have no active dive presence yet."
              : "No visible dive presence yet."
          }
          description={
            isOwner
              ? "Mark your dive presence to let others know where you're planning to dive."
              : undefined
          }
          cta={
            isOwner
              ? {
                  label: "Create dive presence",
                  href: "/buddies?tab=my-dive-presence",
                }
              : undefined
          }
        />
      )}
    </section>
  );
}

function ProfileDiveSitesSection({
  items,
  isOwner,
}: {
  items: ProfileDiveSiteAffinity[];
  isOwner: boolean;
}) {
  return (
    <section className="space-y-3">
      <SectionHeader
        icon={<MapPinned className="h-4 w-4" />}
        title="Dive Sites"
      />
      {items.length > 0 ? (
        <DivingList>
          {items.map((item) => (
            <ProfileDiveSiteAffinityItem key={item.id} item={item} />
          ))}
        </DivingList>
      ) : (
        <EmptyDivingState
          title={
            isOwner
              ? "You have not added any dive sites yet."
              : "No visible dive sites yet."
          }
          description={
            isOwner
              ? "Add yourself as a local, regular, or interested diver."
              : undefined
          }
          cta={
            isOwner
              ? { label: "Add dive site", href: "/buddies?tab=my-dive-sites" }
              : undefined
          }
        />
      )}
    </section>
  );
}

function ProfileDivePresenceItem({ item }: { item: ProfileDivePresence }) {
  return (
    <DivingListItem
      href={`/explore/sites/${item.diveSiteSlug}`}
      title={item.diveSiteName}
      area={item.diveSiteArea}
      badge={presenceLabel(item.presenceType)}
      note={item.note}
      viewerCanContact={item.viewerCanContact}
      meta={availabilityLabel(item)}
    />
  );
}

function ProfileDiveSiteAffinityItem({
  item,
}: {
  item: ProfileDiveSiteAffinity;
}) {
  return (
    <DivingListItem
      href={`/explore/sites/${item.diveSiteSlug}`}
      title={item.diveSiteName}
      area={item.diveSiteArea}
      badge={relationshipLabel(item.relationship)}
      note={item.note}
      viewerCanContact={item.viewerCanContact}
    />
  );
}

function DivingList({ children }: { children: React.ReactNode }) {
  return (
    <div className="divide-y divide-border/70 border-y border-border/70">
      {children}
    </div>
  );
}

function DivingListItem({
  href,
  title,
  area,
  badge,
  note,
  meta,
  viewerCanContact,
}: {
  href: string;
  title: string;
  area?: string;
  badge: string;
  note?: string;
  meta?: string;
  viewerCanContact: boolean;
}) {
  return (
    <article className="space-y-2 py-3 text-sm">
      <div className="min-w-0 space-y-1">
        <Link
          href={href}
          className="line-clamp-1 font-semibold text-foreground hover:underline"
        >
          {title}
        </Link>
        {area ? (
          <p className="line-clamp-1 text-xs text-muted-foreground">{area}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge className="h-5 px-2 text-[11px]">{badge}</Badge>
        {meta ? (
          <Badge variant="outline" className="h-5 px-2 text-[11px]">
            {meta}
          </Badge>
        ) : null}
      </div>
      {note ? (
        <p className="text-xs leading-5 text-muted-foreground">{note}</p>
      ) : null}
      {viewerCanContact ? (
        <Button size="xs" variant="outline">
          <MessageCircle className="mr-1 h-3 w-3" />
          Contact
        </Button>
      ) : null}
    </article>
  );
}

function SectionHeader({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 text-base font-semibold">
      {icon}
      <h2>{title}</h2>
    </div>
  );
}

function EmptyDivingState({
  title,
  description,
  cta,
}: {
  title: string;
  description?: string;
  cta?: { label: string; href: string };
}) {
  return (
    <div className="rounded-xl border border-dashed border-border/70 bg-background/55 px-4 py-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description ? (
          <p className="text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {cta ? (
        <Button size="sm" className="mt-3" render={<Link href={cta.href} />}>
          {cta.label}
        </Button>
      ) : null}
    </div>
  );
}

function StatusCard({ title }: { title: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border/70 bg-background/55 px-4 py-3 text-sm text-muted-foreground">
      {title}
    </div>
  );
}

function presenceLabel(value: ProfileDivePresence["presenceType"]) {
  if (value === "fun_dive") return "Fun dive";
  return titleCase(value);
}

function relationshipLabel(value: ProfileDiveSiteAffinity["relationship"]) {
  return titleCase(value);
}

function availabilityLabel(item: ProfileDivePresence) {
  if (!item.startAt && !item.endAt) return "Flexible";
  if (item.startAt && item.endAt) {
    return `${formatDateTime(item.startAt)} - ${formatDateTime(item.endAt)}`;
  }
  if (item.startAt) return `From ${formatDateTime(item.startAt)}`;
  return `Until ${formatDateTime(item.endAt ?? "")}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Flexible";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function titleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
