"use client";

import type * as React from "react";
import { useState } from "react";
import type {
  ActivityFeedItem,
  CreateDivePresenceRequest,
  CreateDiveSiteAffinityRequest,
  DivePresenceItem,
  DiveSiteAffinityItem,
  ExploreSiteRelatedCounts,
} from "@freediving.ph/types";
import { CalendarClock, MapPinned, MessageCircle, Users } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

type DiveSiteRelatedTabsProps = {
  siteId: string;
  slug: string;
  counts: ExploreSiteRelatedCounts;
  availableBuddies: DivePresenceItem[];
  localRegulars: DiveSiteAffinityItem[];
  communityPosts: ActivityFeedItem[];
  communityNextCursor?: string;
};

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
}: DiveSiteRelatedTabsProps) {
  const [presenceItems, setPresenceItems] = useState(availableBuddies);
  const [affinityItems, setAffinityItems] = useState(localRegulars);
  const [communityFeed, setCommunityFeed] = useState(communityPosts);
  const [nextCursor, setNextCursor] = useState(communityNextCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [presenceSaving, setPresenceSaving] = useState(false);
  const [affinitySaving, setAffinitySaving] = useState(false);
  const [presenceError, setPresenceError] = useState("");
  const [affinityError, setAffinityError] = useState("");
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
  const communityItems = activityToHomeFeedItems(communityFeed);
  const availableBuddyCount =
    counts.availableBuddyCount ?? counts.buddies ?? presenceItems.length;
  const localRegularCount = counts.localRegularCount ?? affinityItems.length;
  const communityPostCount =
    counts.communityPostCount ?? counts.communityPosts ?? communityItems.length;

  const loadMoreCommunityPosts = async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    setLoadError("");
    try {
      const page = await exploreApi.getSiteCommunityPosts(slug, nextCursor);
      setCommunityFeed((current) => {
        const existing = new Set(current.map((item) => item.id));
        const nextItems = page.items.filter((item) => !existing.has(item.id));
        return [...current, ...nextItems];
      });
      setNextCursor(page.nextCursor);
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
      setPresenceItems((current) => [response.presence, ...current]);
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
      setAffinityItems((current) => [response.affinity, ...current]);
    } catch {
      setAffinityError("Could not add your local or regular connection.");
    } finally {
      setAffinitySaving(false);
    }
  };

  return (
    <Tabs defaultValue="available-buddies" className="space-y-4">
      <TabsList className="w-full justify-start overflow-x-auto">
        <TabsTrigger value="available-buddies">
          Available Buddies ({availableBuddyCount})
        </TabsTrigger>
        <TabsTrigger value="locals">
          Locals & Regulars ({localRegularCount})
        </TabsTrigger>
        <TabsTrigger value="community">
          Community Posts ({communityPostCount})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="available-buddies" className="space-y-3">
        <PresenceForm
          form={presenceForm}
          setForm={setPresenceForm}
          onSubmit={submitPresence}
          saving={presenceSaving}
          error={presenceError}
        />
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
        <AffinityForm
          form={affinityForm}
          setForm={setAffinityForm}
          onSubmit={submitAffinity}
          saving={affinitySaving}
          error={affinityError}
        />
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
    <form onSubmit={onSubmit} className="space-y-3 rounded-md border p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <CalendarClock className="size-4" />
        Mark my dive presence
      </div>
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
          <Field label="Start">
            <Input
              type="datetime-local"
              value={form.startAt ?? ""}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  startAt: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="End">
            <Input
              type="datetime-local"
              value={form.endAt ?? ""}
              onChange={(event) =>
                setForm((current) => ({ ...current, endAt: event.target.value }))
              }
            />
          </Field>
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
    <form onSubmit={onSubmit} className="space-y-3 rounded-md border p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <MapPinned className="size-4" />
        Add myself as local/regular
      </div>
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
