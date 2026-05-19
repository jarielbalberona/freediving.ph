"use client";

import type {
  ProfileDivePresence,
  ProfileDiveSiteAffinity,
  ProfileDivingResponse,
  ProfileMediaItem,
} from "@freediving.ph/types";
import { CalendarClock, MapPinned, MessageCircle } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ProfileGrid } from "@/features/profile/components/ProfileGrid";

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
  isOwner: boolean;
};

type ProfileTabValue = "posts" | "diving";

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
  isOwner,
}: ProfileTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: ProfileTabValue = tabParam === "diving" ? "diving" : "posts";

  const setTab = (value: string | null) => {
    const nextTab: ProfileTabValue = value === "diving" ? "diving" : "posts";
    const nextParams = new URLSearchParams(searchParams.toString());
    if (nextTab === "posts") {
      nextParams.set("tab", "posts");
    } else {
      nextParams.set("tab", "diving");
    }
    const suffix = nextParams.toString();
    router.replace(`${pathname}${suffix ? `?${suffix}` : ""}`, {
      scroll: false,
    });
  };

  return (
    <section className="space-y-0">
      <Separator />
      <Tabs value={activeTab} onValueChange={setTab} className="gap-5 pt-2">
        <TabsList className="mx-auto grid w-full max-w-sm grid-cols-2">
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="diving">Diving</TabsTrigger>
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
        <TabsContent value="diving">
          <ProfileDivingTab
            data={diving}
            isLoading={isLoadingDiving}
            isOwner={isOwner}
          />
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
}: Omit<ProfileTabsProps, "diving" | "isLoadingDiving" | "isOwner">) {
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
      <div className="grid gap-4 md:grid-cols-2">
        <StatusCard title="Loading Dive Presence" />
        <StatusCard title="Loading Dive Sites" />
      </div>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2">
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
        <div className="space-y-3">
          {items.map((item) => (
            <ProfileDivePresenceCard key={item.id} item={item} />
          ))}
        </div>
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
              ? { label: "Create dive presence", href: "/buddies?tab=my-dive-presence" }
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
        <div className="space-y-3">
          {items.map((item) => (
            <ProfileDiveSiteAffinityCard key={item.id} item={item} />
          ))}
        </div>
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

function ProfileDivePresenceCard({ item }: { item: ProfileDivePresence }) {
  return (
    <DivingCard
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

function ProfileDiveSiteAffinityCard({
  item,
}: {
  item: ProfileDiveSiteAffinity;
}) {
  return (
    <DivingCard
      href={`/explore/sites/${item.diveSiteSlug}`}
      title={item.diveSiteName}
      area={item.diveSiteArea}
      badge={relationshipLabel(item.relationship)}
      note={item.note}
      viewerCanContact={item.viewerCanContact}
    />
  );
}

function DivingCard({
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
    <Card size="sm" className="rounded-lg">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <Link
              href={href}
              className="line-clamp-1 font-medium text-foreground hover:underline"
            >
              {title}
            </Link>
            {area ? (
              <p className="line-clamp-1 text-xs text-muted-foreground">
                {area}
              </p>
            ) : null}
          </div>
          <Badge>{badge}</Badge>
        </div>
        {meta ? <Badge variant="outline">{meta}</Badge> : null}
        {note ? <p className="text-sm text-muted-foreground">{note}</p> : null}
        {viewerCanContact ? (
          <Button size="sm" variant="outline" className="rounded-full">
            <MessageCircle className="mr-2 h-4 w-4" />
            Contact
          </Button>
        ) : null}
      </CardContent>
    </Card>
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
    <Card className="rounded-lg border-dashed">
      <CardContent className="space-y-3 p-4">
        <div className="space-y-1">
          <p className="font-medium">{title}</p>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {cta ? (
          <Button size="sm" render={<Link href={cta.href} />}>
            {cta.label}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function StatusCard({ title }: { title: string }) {
  return (
    <Card className="rounded-lg border-dashed">
      <CardContent className="p-4 text-sm text-muted-foreground">
        {title}
      </CardContent>
    </Card>
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
