"use client";

import type * as React from "react";
import { useState } from "react";
import type {
  ActivityFeedItem,
  CreateDivePresenceRequest,
  CreateDiveSiteAffinityRequest,
  CreateDiveSiteReviewRequest,
  DivePresenceListResponse,
  DivePresenceItem,
  DiveSiteAffinityListResponse,
  DiveSiteAffinityItem,
  DiveSiteReviewListResponse,
  DiveSiteReviewItem,
  ExploreSiteCommunityPostsResponse,
  ExploreSiteRelatedCounts,
  ExploreSiteRelatedResponse,
} from "@freediving.ph/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, MapPinned, MessageCircle, Star, Users } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { exploreApi } from "@/features/diveSpots/api/explore-v1";
import { activityToHomeFeedItems } from "@/features/home-feed/adapters/activity-to-home-feed";
import { FeedItemRenderer } from "@/features/home-feed/components/FeedItemRenderer";
import { queryKeys } from "@/lib/query/query-keys";

type DiveSiteRelatedTabsProps = {
  siteId: string;
  slug: string;
  counts: ExploreSiteRelatedCounts;
  availableBuddies: DivePresenceItem[];
  localRegulars: DiveSiteAffinityItem[];
  communityPosts: ActivityFeedItem[];
  communityNextCursor?: string;
  reviews: DiveSiteReviewItem[];
  reviewCount: number;
  averageRating: number;
};

const relatedTabValues = [
  "available-buddies",
  "locals",
  "community",
  "reviews",
] as const;

type DiveSiteRelatedTab = (typeof relatedTabValues)[number];

const defaultRelatedTab = "available-buddies" satisfies DiveSiteRelatedTab;

const tabFromParam = (value: string | null): DiveSiteRelatedTab =>
  relatedTabValues.includes(value as DiveSiteRelatedTab)
    ? (value as DiveSiteRelatedTab)
    : defaultRelatedTab;

const titleCase = (value: string) =>
  value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

const initialsFor = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "D";

const rfc3339FromLocal = (value: string) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
};

const dateFromLocalValue = (value?: string) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const timeFromLocalValue = (value?: string) => {
  const parsed = dateFromLocalValue(value);
  if (!parsed) return "08:00";
  return `${String(parsed.getHours()).padStart(2, "0")}:${String(
    parsed.getMinutes(),
  ).padStart(2, "0")}`;
};

const localValueFromDateTime = (date?: Date, time = "08:00") => {
  if (!date) return "";
  const [hours = "08", minutes = "00"] = time.split(":");
  const next = new Date(date);
  next.setHours(Number(hours), Number(minutes), 0, 0);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(next.getDate()).padStart(2, "0")}T${String(
    next.getHours(),
  ).padStart(2, "0")}:${String(next.getMinutes()).padStart(2, "0")}`;
};

const availabilityLabel = (item: DivePresenceItem) => {
  if (!item.startAt && !item.endAt) return "Flexible availability";
  if (item.startAt && item.endAt) {
    return `${new Date(item.startAt).toLocaleString()} - ${new Date(item.endAt).toLocaleString()}`;
  }
  if (item.startAt) return `From ${new Date(item.startAt).toLocaleString()}`;
  return `Until ${new Date(item.endAt ?? "").toLocaleString()}`;
};

export function DiveSiteRelatedTabs({
  siteId,
  slug,
  counts,
  availableBuddies,
  localRegulars,
  communityPosts,
  communityNextCursor,
  reviews,
  reviewCount,
  averageRating,
}: DiveSiteRelatedTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const activeTab = tabFromParam(searchParams.get("tab"));
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [presenceSaving, setPresenceSaving] = useState(false);
  const [affinitySaving, setAffinitySaving] = useState(false);
  const [reviewSaving, setReviewSaving] = useState(false);
  const [presenceDialogOpen, setPresenceDialogOpen] = useState(false);
  const [affinityDialogOpen, setAffinityDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [presenceError, setPresenceError] = useState("");
  const [affinityError, setAffinityError] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [presenceForm, setPresenceForm] = useState<CreateDivePresenceRequest>({
    presenceType: "available",
    flexible: true,
    visibility: "members",
    contactEnabled: true,
    note: "",
  });
  const [affinityForm, setAffinityForm] =
    useState<CreateDiveSiteAffinityRequest>({
      relationship: "regular",
      visibility: "members",
      contactEnabled: false,
      note: "",
    });
  const [reviewForm, setReviewForm] = useState<CreateDiveSiteReviewRequest>({
    rating: 5,
    visibility: "members",
    comment: "",
  });
  const relatedQuery = useQuery({
    queryKey: queryKeys.explore.siteRelated(slug),
    queryFn: () => exploreApi.getSiteRelated(slug),
    initialData: {
      counts,
      previews: {
        availableBuddies,
        buddies: availableBuddies,
        localRegulars,
        communityPosts,
        reviews,
      },
      sourceBreakdown: {
        areaFallbackCount: 0,
        siteLinkedCount: 0,
      },
    } as ExploreSiteRelatedResponse,
    staleTime: 60_000,
  });
  const presenceQuery = useQuery({
    queryKey: queryKeys.explore.sitePresence(slug),
    queryFn: () => exploreApi.getSitePresence(slug, 20),
    initialData: { items: availableBuddies } satisfies DivePresenceListResponse,
    staleTime: 60_000,
  });
  const affinityQuery = useQuery({
    queryKey: queryKeys.explore.siteAffinities(slug),
    queryFn: () => exploreApi.getSiteAffinities(slug, 20),
    initialData: { items: localRegulars } satisfies DiveSiteAffinityListResponse,
    staleTime: 60_000,
  });
  const communityQuery = useQuery({
    queryKey: queryKeys.explore.siteCommunityPosts(slug),
    queryFn: () => exploreApi.getSiteCommunityPosts(slug),
    initialData: {
      items: communityPosts,
      nextCursor: communityNextCursor,
    } satisfies ExploreSiteCommunityPostsResponse,
    staleTime: 60_000,
  });
  const reviewsQuery = useQuery({
    queryKey: queryKeys.explore.siteReviews(slug),
    queryFn: () => exploreApi.getSiteReviews(slug, 20),
    initialData: {
      items: reviews,
      reviewCount,
      averageRating,
    } satisfies DiveSiteReviewListResponse,
    staleTime: 60_000,
  });
  const relatedCounts = relatedQuery.data?.counts ?? counts;
  const presenceItems = presenceQuery.data?.items ?? [];
  const affinityItems = affinityQuery.data?.items ?? [];
  const communityFeed = communityQuery.data?.items ?? [];
  const nextCursor = communityQuery.data?.nextCursor;
  const reviewItems = reviewsQuery.data?.items ?? [];
  const currentReviewCount = reviewsQuery.data?.reviewCount ?? reviewCount;
  const currentAverageRating = reviewsQuery.data?.averageRating ?? averageRating;
  const communityItems = activityToHomeFeedItems(communityFeed);
  const availableBuddyCount =
    relatedCounts.availableBuddyCount ?? relatedCounts.buddies ?? presenceItems.length;
  const localRegularCount = relatedCounts.localRegularCount ?? affinityItems.length;
  const communityPostCount =
    relatedCounts.communityPostCount ?? relatedCounts.communityPosts ?? communityItems.length;
  const visibleReviewCount = Math.max(
    currentReviewCount ?? relatedCounts.reviewCount ?? 0,
    reviewItems.length,
  );

  const setActiveTab = (value: string | null) => {
    const nextTab = tabFromParam(value);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("tab", nextTab);
    const suffix = nextParams.toString();
    router.replace(`${pathname}${suffix ? `?${suffix}` : ""}`, {
      scroll: false,
    });
  };

  const patchRelatedCounts = (patch: Partial<ExploreSiteRelatedCounts>) => {
    queryClient.setQueryData(
      queryKeys.explore.siteRelated(slug),
      (current: ExploreSiteRelatedResponse | undefined) => {
        if (!current) return current;
        return {
          ...current,
          counts: { ...current.counts, ...patch },
        };
      },
    );
  };

  const loadMoreCommunityPosts = async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    setLoadError("");
    try {
      const page = await exploreApi.getSiteCommunityPosts(slug, nextCursor);
      queryClient.setQueryData(
        queryKeys.explore.siteCommunityPosts(slug),
        (current: ExploreSiteCommunityPostsResponse | undefined) => {
          const items = current?.items ?? [];
          const existing = new Set(items.map((item) => item.id));
          const nextItems = page.items.filter((item) => !existing.has(item.id));
          return {
            items: [...items, ...nextItems],
            nextCursor: page.nextCursor,
          };
        },
      );
      patchRelatedCounts({
        communityPostCount: Math.max(
          communityPostCount,
          communityFeed.length + page.items.length,
        ),
        communityPosts: Math.max(
          relatedCounts.communityPosts ?? 0,
          communityFeed.length + page.items.length,
        ),
      });
    } catch {
      setLoadError("Could not load more community posts.");
    } finally {
      setIsLoadingMore(false);
    }
  };

  const submitPresence = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPresenceSaving(true);
    setPresenceError("");
    try {
      const response = await exploreApi.createSitePresence(slug, {
        ...presenceForm,
        startAt: presenceForm.flexible
          ? undefined
          : rfc3339FromLocal(presenceForm.startAt ?? ""),
        endAt: presenceForm.flexible
          ? undefined
          : rfc3339FromLocal(presenceForm.endAt ?? ""),
        note: presenceForm.note?.trim() || undefined,
      });
      queryClient.setQueryData(
        queryKeys.explore.sitePresence(slug),
        (current: DivePresenceListResponse | undefined) => ({
          items: [
            response.presence,
            ...(current?.items ?? []).filter((item) => item.id !== response.presence.id),
          ],
        }),
      );
      patchRelatedCounts({
        availableBuddyCount: Math.max(availableBuddyCount + 1, presenceItems.length + 1),
        buddies: Math.max(availableBuddyCount + 1, presenceItems.length + 1),
      });
      setPresenceDialogOpen(false);
    } catch {
      setPresenceError("Could not mark your dive presence.");
    } finally {
      setPresenceSaving(false);
    }
  };

  const submitAffinity = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAffinitySaving(true);
    setAffinityError("");
    try {
      const response = await exploreApi.createSiteAffinity(slug, {
        ...affinityForm,
        note: affinityForm.note?.trim() || undefined,
      });
      queryClient.setQueryData(
        queryKeys.explore.siteAffinities(slug),
        (current: DiveSiteAffinityListResponse | undefined) => ({
          items: [
            response.affinity,
            ...(current?.items ?? []).filter((item) => item.id !== response.affinity.id),
          ],
        }),
      );
      patchRelatedCounts({
        localRegularCount: Math.max(localRegularCount + 1, affinityItems.length + 1),
      });
      setAffinityDialogOpen(false);
    } catch {
      setAffinityError("Could not add your local or regular connection.");
    } finally {
      setAffinitySaving(false);
    }
  };

  const submitReview = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setReviewSaving(true);
    setReviewError("");
    try {
      const response = await exploreApi.createSiteReview(slug, {
        ...reviewForm,
        comment: reviewForm.comment?.trim() || undefined,
      });
      queryClient.setQueryData(
        queryKeys.explore.siteReviews(slug),
        (current: DiveSiteReviewListResponse | undefined) => {
          const items = current?.items ?? [];
          const replacesExistingUser = items.some(
            (item) => item.userId === response.review.userId,
          );
          const nextItems = [
            response.review,
            ...items.filter((item) => item.userId !== response.review.userId),
          ];
          const nextReviewCount = replacesExistingUser
            ? (current?.reviewCount ?? visibleReviewCount)
            : Math.max(current?.reviewCount ?? 0, visibleReviewCount) + 1;
          const loadedAverage =
            nextItems.reduce((sum, item) => sum + item.rating, 0) / nextItems.length;
          return {
            items: nextItems,
            reviewCount: nextReviewCount,
            averageRating: Number.isFinite(loadedAverage)
              ? loadedAverage
              : (current?.averageRating ?? currentAverageRating),
          };
        },
      );
      patchRelatedCounts({
        reviewCount: Math.max(
          visibleReviewCount,
          reviewItems.some((item) => item.userId === response.review.userId)
            ? visibleReviewCount
            : visibleReviewCount + 1,
        ),
      });
      setReviewDialogOpen(false);
    } catch {
      setReviewError("Could not save your review.");
    } finally {
      setReviewSaving(false);
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList className="w-full justify-start overflow-x-auto">
        <TabsTrigger
          value="available-buddies"
          onClick={() => setActiveTab("available-buddies")}
        >
          Available Buddies ({availableBuddyCount})
        </TabsTrigger>
        <TabsTrigger value="locals" onClick={() => setActiveTab("locals")}>
          Locals & Regulars ({localRegularCount})
        </TabsTrigger>
        <TabsTrigger
          value="community"
          onClick={() => setActiveTab("community")}
        >
          Community Posts ({communityPostCount})
        </TabsTrigger>
        <TabsTrigger value="reviews" onClick={() => setActiveTab("reviews")}>
          Reviews ({visibleReviewCount})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="available-buddies" className="space-y-3">
        <Button
          type="button"
          size="sm"
          onClick={() => setPresenceDialogOpen(true)}
        >
          <CalendarClock className="size-4" />
          Mark my dive presence
        </Button>
        <Dialog open={presenceDialogOpen} onOpenChange={setPresenceDialogOpen}>
          <DialogContent className="max-w-2xl!">
            <DialogHeader>
              <DialogTitle>Mark my dive presence</DialogTitle>
            </DialogHeader>
            <PresenceForm
              form={presenceForm}
              setForm={setPresenceForm}
              onSubmit={submitPresence}
              saving={presenceSaving}
              error={presenceError}
            />
          </DialogContent>
        </Dialog>
        {presenceItems.length === 0 ? (
          <Card size="sm" className="border-dashed">
            <CardContent className="text-sm text-muted-foreground">
              No available buddies yet. Be the first to mark your dive presence.
            </CardContent>
          </Card>
        ) : (
          presenceItems.map((item) => (
            <Card key={item.id} size="sm">
              <CardContent className="space-y-3 text-sm">
                <UserLine
                  name={item.displayName || item.username || "Freediver"}
                  username={item.username}
                  avatarUrl={item.avatarUrl}
                />
                <div className="flex flex-wrap gap-2">
                  <Badge>{titleCase(item.presenceType)}</Badge>
                  <Badge variant="outline">{availabilityLabel(item)}</Badge>
                </div>
                {item.note ? (
                  <p className="text-muted-foreground">{item.note}</p>
                ) : null}
                {item.contactAllowed ? (
                  <Button type="button" size="sm" variant="outline">
                    <MessageCircle className="size-4" />
                    Contact
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))
        )}
      </TabsContent>

      <TabsContent value="locals" className="space-y-3">
        <Button
          type="button"
          size="sm"
          onClick={() => setAffinityDialogOpen(true)}
        >
          <MapPinned className="size-4" />
          Add myself as local/regular
        </Button>
        <Dialog open={affinityDialogOpen} onOpenChange={setAffinityDialogOpen}>
          <DialogContent className="max-w-2xl!">
            <DialogHeader>
              <DialogTitle>Add myself as local/regular</DialogTitle>
            </DialogHeader>
            <AffinityForm
              form={affinityForm}
              setForm={setAffinityForm}
              onSubmit={submitAffinity}
              saving={affinitySaving}
              error={affinityError}
            />
          </DialogContent>
        </Dialog>
        {affinityItems.length === 0 ? (
          <Card size="sm" className="border-dashed">
            <CardContent className="text-sm text-muted-foreground">
              No locals or regulars yet. Mark yourself as connected to this site.
            </CardContent>
          </Card>
        ) : (
          affinityItems.map((item) => (
            <Card key={item.id} size="sm">
              <CardContent className="space-y-3 text-sm">
                <UserLine
                  name={item.displayName || item.username || "Freediver"}
                  username={item.username}
                  avatarUrl={item.avatarUrl}
                />
                <Badge>{titleCase(item.relationship)}</Badge>
                {item.note ? (
                  <p className="text-muted-foreground">{item.note}</p>
                ) : null}
                {item.contactAllowed ? (
                  <Button type="button" size="sm" variant="outline">
                    <MessageCircle className="size-4" />
                    Contact
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))
        )}
      </TabsContent>

      <TabsContent value="community" className="space-y-3">
        {communityItems.length === 0 ? (
          <Card size="sm" className="border-dashed">
            <CardContent className="text-sm text-muted-foreground">
              No community posts tagged to this spot yet.
            </CardContent>
          </Card>
        ) : (
          communityItems.map((item, index) => (
            <FeedItemRenderer
              key={item.id}
              item={item}
              position={index}
              onAction={() => undefined}
              showActions={false}
            />
          ))
        )}
        {loadError ? (
          <p className="text-sm text-destructive">{loadError}</p>
        ) : null}
        {nextCursor ? (
          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadMoreCommunityPosts}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? "Loading..." : "Load more"}
            </Button>
          </div>
        ) : null}
      </TabsContent>

      <TabsContent value="reviews" className="space-y-3">
        <Button
          type="button"
          size="sm"
          onClick={() => setReviewDialogOpen(true)}
        >
          <Star className="size-4" />
          Review this site
        </Button>
        <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
          <DialogContent className="max-w-2xl!">
            <DialogHeader>
              <DialogTitle>Review this site</DialogTitle>
            </DialogHeader>
            <ReviewForm
              form={reviewForm}
              setForm={setReviewForm}
              onSubmit={submitReview}
              saving={reviewSaving}
              error={reviewError}
            />
          </DialogContent>
        </Dialog>
        {visibleReviewCount > 0 ? (
          <p className="text-sm text-muted-foreground">
            {currentAverageRating.toFixed(1)} average rating
          </p>
        ) : null}
        {reviewItems.length === 0 ? (
          <Card size="sm" className="border-dashed">
            <CardContent className="text-sm text-muted-foreground">
              No reviews yet. Be the first to review this dive site.
            </CardContent>
          </Card>
        ) : (
          reviewItems.map((item) => (
            <Card key={item.id} size="sm">
              <CardContent className="space-y-3 text-sm">
                <UserLine
                  name={item.displayName || item.username || "Freediver"}
                  username={item.username}
                  avatarUrl={item.avatarUrl}
                />
                <Badge variant="outline">{item.rating}/5</Badge>
                {item.comment ? (
                  <p className="text-muted-foreground">{item.comment}</p>
                ) : null}
              </CardContent>
            </Card>
          ))
        )}
      </TabsContent>
    </Tabs>
  );
}

function UserLine({
  name,
  username,
  avatarUrl,
}: {
  name: string;
  username?: string;
  avatarUrl?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Avatar>
        {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
        <AvatarFallback>{initialsFor(name)}</AvatarFallback>
      </Avatar>
      <div>
        <p className="font-medium text-foreground">{name}</p>
        {username ? (
          <p className="text-xs text-muted-foreground">@{username}</p>
        ) : null}
      </div>
    </div>
  );
}

function PresenceForm({
  form,
  setForm,
  onSubmit,
  saving,
  error,
}: {
  form: CreateDivePresenceRequest;
  setForm: React.Dispatch<React.SetStateAction<CreateDivePresenceRequest>>;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  saving: boolean;
  error: string;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Presence type">
          <select
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            value={form.presenceType}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                presenceType: event.target
                  .value as CreateDivePresenceRequest["presenceType"],
              }))
            }
          >
            <option value="available">Available</option>
            <option value="planning">Planning</option>
            <option value="training">Training</option>
            <option value="fun_dive">Fun dive</option>
          </select>
        </Field>
        <Field label="Visibility">
          <select
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            value={form.visibility}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                visibility: event.target
                  .value as CreateDivePresenceRequest["visibility"],
              }))
            }
          >
            <option value="members">Members</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.flexible}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              flexible: event.target.checked,
            }))
          }
        />
        Flexible availability
      </label>
      {!form.flexible ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <DateTimeField
            label="Start"
            value={form.startAt}
            min={new Date()}
            onChange={(value) =>
              setForm((current) => ({ ...current, startAt: value }))
            }
          />
          <DateTimeField
            label="End"
            value={form.endAt}
            min={dateFromLocalValue(form.startAt) ?? new Date()}
            onChange={(value) =>
              setForm((current) => ({ ...current, endAt: value }))
            }
          />
        </div>
      ) : null}
      <Textarea
        placeholder="Note"
        value={form.note ?? ""}
        onChange={(event) =>
          setForm((current) => ({ ...current, note: event.target.value }))
        }
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.contactEnabled}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              contactEnabled: event.target.checked,
            }))
          }
        />
        Allow contact
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" size="sm" disabled={saving}>
        <Users className="size-4" />
        {saving ? "Saving..." : "Mark my dive presence"}
      </Button>
    </form>
  );
}

function AffinityForm({
  form,
  setForm,
  onSubmit,
  saving,
  error,
}: {
  form: CreateDiveSiteAffinityRequest;
  setForm: React.Dispatch<React.SetStateAction<CreateDiveSiteAffinityRequest>>;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  saving: boolean;
  error: string;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Relationship">
          <select
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            value={form.relationship}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                relationship: event.target
                  .value as CreateDiveSiteAffinityRequest["relationship"],
              }))
            }
          >
            <option value="local">Local</option>
            <option value="regular">Regular</option>
            <option value="instructor">Instructor</option>
            <option value="operator">Operator</option>
            <option value="interested">Interested</option>
          </select>
        </Field>
        <Field label="Visibility">
          <select
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            value={form.visibility}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                visibility: event.target
                  .value as CreateDiveSiteAffinityRequest["visibility"],
              }))
            }
          >
            <option value="members">Members</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </Field>
      </div>
      <Textarea
        placeholder="Note"
        value={form.note ?? ""}
        onChange={(event) =>
          setForm((current) => ({ ...current, note: event.target.value }))
        }
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.contactEnabled}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              contactEnabled: event.target.checked,
            }))
          }
        />
        Allow contact
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" size="sm" disabled={saving}>
        <MapPinned className="size-4" />
        {saving ? "Saving..." : "Add myself as local/regular"}
      </Button>
    </form>
  );
}

function ReviewForm({
  form,
  setForm,
  onSubmit,
  saving,
  error,
}: {
  form: CreateDiveSiteReviewRequest;
  setForm: React.Dispatch<React.SetStateAction<CreateDiveSiteReviewRequest>>;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  saving: boolean;
  error: string;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Rating">
          <Input
            type="number"
            min={1}
            max={5}
            value={form.rating}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                rating: Number(event.target.value),
              }))
            }
          />
        </Field>
        <Field label="Visibility">
          <select
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            value={form.visibility}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                visibility: event.target
                  .value as CreateDiveSiteReviewRequest["visibility"],
              }))
            }
          >
            <option value="members">Members</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </Field>
      </div>
      <Textarea
        placeholder="Share what divers should know about this site."
        value={form.comment ?? ""}
        onChange={(event) =>
          setForm((current) => ({ ...current, comment: event.target.value }))
        }
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" size="sm" disabled={saving}>
        <Star className="size-4" />
        {saving ? "Saving..." : "Submit review"}
      </Button>
    </form>
  );
}

function DateTimeField({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value?: string;
  min?: Date;
  onChange: (value?: string) => void;
}) {
  const selectedDate = dateFromLocalValue(value);
  const selectedTime = timeFromLocalValue(value);

  return (
    <Field label={label}>
      <div className="grid gap-2">
        <DatePicker
          placeholder={`Pick ${label.toLowerCase()} date`}
          value={selectedDate}
          min={min}
          onSelect={(date) =>
            onChange(date ? localValueFromDateTime(date, selectedTime) : "")
          }
        />
        <Input
          type="time"
          value={selectedTime}
          onChange={(event) =>
            onChange(
              selectedDate
                ? localValueFromDateTime(selectedDate, event.target.value)
                : "",
            )
          }
        />
      </div>
    </Field>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
