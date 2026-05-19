"use client";

import { SignInButton } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, MapPinned, MessageCircle, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import type {
  CreateDivePresenceRequest,
  CreateDiveSiteAffinityRequest,
  DivePresenceItem,
  DivePresenceType,
  DiveSiteAffinityItem,
  DiveSiteAffinityRelationship,
  ExploreSiteCard,
} from "@freediving.ph/types";

import {
  CommunityAccessNote,
  CommunityBrowseToolbar,
  CommunityEmptyState,
  CommunityHeader,
  CommunityPageShell,
  CommunityStats,
} from "@/components/community/community-page";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/features/auth/session";
import { exploreApi } from "@/features/diveSpots/api/explore-v1";
import { getApiErrorMessage } from "@/lib/http/api-error";

type DateFilter = "any" | "today" | "weekend" | "flexible" | "custom";

type PresenceDraft = CreateDivePresenceRequest & {
  siteSlug: string;
  presenceId?: string;
};

type AffinityDraft = CreateDiveSiteAffinityRequest & {
  siteSlug: string;
  affinityId?: string;
};

const PRESENCE_TYPES: Array<{ value: DivePresenceType; label: string }> = [
  { value: "available", label: "Available" },
  { value: "planning", label: "Planning" },
  { value: "training", label: "Training" },
  { value: "fun_dive", label: "Fun dive" },
];

const RELATIONSHIPS: Array<{ value: DiveSiteAffinityRelationship; label: string }> = [
  { value: "local", label: "Local" },
  { value: "regular", label: "Regular" },
  { value: "instructor", label: "Instructor" },
  { value: "operator", label: "Operator" },
  { value: "interested", label: "Interested" },
];

const VISIBILITY_ITEMS = [
  { value: "members", label: "Members" },
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
] as const;

const emptyPresenceDraft = (): PresenceDraft => ({
  siteSlug: "",
  presenceType: "available",
  flexible: true,
  visibility: "members",
  contactEnabled: true,
  startAt: "",
  endAt: "",
  note: "",
});

const emptyAffinityDraft = (): AffinityDraft => ({
  siteSlug: "",
  relationship: "regular",
  visibility: "members",
  contactEnabled: false,
  note: "",
});

export default function BuddiesPage() {
  const session = useSession();
  const queryClient = useQueryClient();
  const isSignedIn = session.status === "signed_in";

  const [siteSlug, setSiteSlug] = useState("all");
  const [area, setArea] = useState("");
  const [presenceType, setPresenceType] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("any");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [presenceDraft, setPresenceDraft] = useState<PresenceDraft>(emptyPresenceDraft);
  const [affinityDraft, setAffinityDraft] = useState<AffinityDraft>(emptyAffinityDraft);

  const sitesQuery = useQuery({
    queryKey: ["explore", "sites", "buddy-presence-selector"],
    queryFn: () => exploreApi.listSites({ limit: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  const presenceFilters = useMemo(() => {
    const range = dateRangeForFilter(dateFilter, dateFrom, dateTo);
    return {
      siteSlug: siteSlug === "all" ? undefined : siteSlug,
      area: area || undefined,
      presenceType: presenceType === "all" ? undefined : presenceType,
      flexible: dateFilter === "flexible" ? true : undefined,
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      limit: 30,
    };
  }, [area, dateFilter, dateFrom, dateTo, presenceType, siteSlug]);

  const globalPresencesQuery = useQuery({
    queryKey: ["explore", "global-presences", presenceFilters],
    queryFn: () => exploreApi.getGlobalPresences(presenceFilters),
  });

  const myPresencesQuery = useQuery({
    queryKey: ["explore", "my-dive-presences"],
    queryFn: () => exploreApi.getMyDivePresences(),
    enabled: isSignedIn,
  });

  const myAffinitiesQuery = useQuery({
    queryKey: ["explore", "my-dive-site-affinities"],
    queryFn: () => exploreApi.getMyDiveSiteAffinities(),
    enabled: isSignedIn,
  });

  const createPresence = useMutation({
    mutationFn: async (draft: PresenceDraft) => {
      const payload = presencePayload(draft);
      return draft.presenceId
        ? exploreApi.updateSitePresence(draft.siteSlug, draft.presenceId, payload)
        : exploreApi.createSitePresence(draft.siteSlug, payload);
    },
    onSuccess: () => {
      toast.success("Dive Presence saved.");
      setPresenceDraft(emptyPresenceDraft());
      queryClient.invalidateQueries({ queryKey: ["explore", "global-presences"] });
      queryClient.invalidateQueries({ queryKey: ["explore", "my-dive-presences"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Could not save Dive Presence")),
  });

  const cancelPresence = useMutation({
    mutationFn: (item: DivePresenceItem) =>
      exploreApi.cancelSitePresence(item.diveSiteSlug ?? "", item.id),
    onSuccess: () => {
      toast.success("Dive Presence cancelled.");
      queryClient.invalidateQueries({ queryKey: ["explore", "global-presences"] });
      queryClient.invalidateQueries({ queryKey: ["explore", "my-dive-presences"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Could not cancel Dive Presence")),
  });

  const saveAffinity = useMutation({
    mutationFn: async (draft: AffinityDraft) => {
      const payload = affinityPayload(draft);
      return draft.affinityId
        ? exploreApi.updateSiteAffinity(draft.siteSlug, draft.affinityId, payload)
        : exploreApi.createSiteAffinity(draft.siteSlug, payload);
    },
    onSuccess: () => {
      toast.success("Dive site relationship saved.");
      setAffinityDraft(emptyAffinityDraft());
      queryClient.invalidateQueries({ queryKey: ["explore", "my-dive-site-affinities"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Could not save dive site relationship")),
  });

  const deleteAffinity = useMutation({
    mutationFn: (item: DiveSiteAffinityItem) =>
      exploreApi.deleteSiteAffinity(item.diveSiteSlug ?? "", item.id),
    onSuccess: () => {
      toast.success("Dive site relationship removed.");
      queryClient.invalidateQueries({ queryKey: ["explore", "my-dive-site-affinities"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Could not remove dive site relationship")),
  });

  const sites = sitesQuery.data?.items ?? [];
  const globalPresences = globalPresencesQuery.data?.items ?? [];
  const myPresences = myPresencesQuery.data?.items ?? [];
  const myAffinities = myAffinitiesQuery.data?.items ?? [];

  return (
    <CommunityPageShell>
      <CommunityHeader
        eyebrow="Buddies"
        title="Find Available Buddies"
        subtitle="Discover active Dive Presence across dive sites, manage your own availability, and keep long-term site relationships separate."
        action={
          isSignedIn ? (
            <Button size="lg" render={<a href="#my-dive-presence" />}>
              <CalendarClock className="mr-2 h-4 w-4" />
              Mark my Dive Presence
            </Button>
          ) : (
            <SignInButton mode="modal">
              <Button size="lg">Sign in to mark Dive Presence</Button>
            </SignInButton>
          )
        }
      />

      <CommunityStats
        items={[
          { label: "Available Buddies", value: String(globalPresences.length), icon: <Search className="h-4 w-4" /> },
          { label: "My Dive Presence", value: String(myPresences.length), icon: <CalendarClock className="h-4 w-4" /> },
          { label: "My Dive Sites", value: String(myAffinities.length), icon: <MapPinned className="h-4 w-4" /> },
        ]}
      />

      <CommunityAccessNote>
        Available Buddies come from active Dive Presence only. Locals and regulars come from long-term dive-site relationships and do not imply availability.
      </CommunityAccessNote>

      <Tabs defaultValue="find" className="gap-5">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="find">Find Buddies</TabsTrigger>
          <TabsTrigger value="presence">My Dive Presence</TabsTrigger>
          <TabsTrigger value="sites">My Dive Sites</TabsTrigger>
        </TabsList>

        <TabsContent value="find" className="space-y-5">
          <CommunityBrowseToolbar
            label={<><Search className="h-4 w-4" /> Global discovery</>}
            title="Available Buddies across dive sites"
            description="Filter active Dive Presence by real dive-site data."
          >
            <div className="grid gap-3 md:grid-cols-4 xl:min-w-[720px]">
              <SiteSelect sites={sites} value={siteSlug} onValueChange={setSiteSlug} includeAll />
              <Input placeholder="Area or province" value={area} onChange={(event) => setArea(event.target.value)} />
              <Select value={presenceType} onValueChange={(value) => setPresenceType(value ?? "all")} items={[{ value: "all", label: "All types" }, ...PRESENCE_TYPES]}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {PRESENCE_TYPES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={(value) => setDateFilter(value as DateFilter)} items={[
                { value: "any", label: "Any time" },
                { value: "today", label: "Today" },
                { value: "weekend", label: "This weekend" },
                { value: "flexible", label: "Flexible" },
                { value: "custom", label: "Custom range" },
              ]}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="weekend">This weekend</SelectItem>
                  <SelectItem value="flexible">Flexible</SelectItem>
                  <SelectItem value="custom">Custom range</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CommunityBrowseToolbar>

          {dateFilter === "custom" ? (
            <div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
              <Field label="From"><DatePicker value={dateFrom} onSelect={setDateFrom} placeholder="Pick start date" /></Field>
              <Field label="To"><DatePicker value={dateTo} min={dateFrom} onSelect={setDateTo} placeholder="Pick end date" /></Field>
            </div>
          ) : null}

          {globalPresencesQuery.isPending ? (
            <StatusCard title="Finding Available Buddies" description="Checking active Dive Presence across dive sites." />
          ) : globalPresences.length > 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {globalPresences.map((item) => <PresenceCard key={item.id} item={item} />)}
            </div>
          ) : (
            <CommunityEmptyState title="No available buddies found" description="Try another dive site or mark your own Dive Presence." />
          )}
        </TabsContent>

        <TabsContent value="presence" id="my-dive-presence" className="space-y-5">
          {!isSignedIn ? <SignInPrompt /> : (
            <>
              <PresenceForm
                title={presenceDraft.presenceId ? "Edit Dive Presence" : "Create Dive Presence"}
                draft={presenceDraft}
                setDraft={setPresenceDraft}
                sites={sites}
                saving={createPresence.isPending}
                onSubmit={() => createPresence.mutate(presenceDraft)}
              />
              <ManagementList
                emptyTitle="No Dive Presence yet"
                emptyDescription="Create a Dive Presence to appear in global discovery and on the selected dive site's Available Buddies tab."
              >
                {myPresences.map((item) => (
                  <PresenceManagementCard
                    key={item.id}
                    item={item}
                    onEdit={() => setPresenceDraft(draftFromPresence(item))}
                    onCancel={() => cancelPresence.mutate(item)}
                    cancelling={cancelPresence.isPending}
                  />
                ))}
              </ManagementList>
            </>
          )}
        </TabsContent>

        <TabsContent value="sites" className="space-y-5">
          {!isSignedIn ? <SignInPrompt /> : (
            <>
              <AffinityForm
                title={affinityDraft.affinityId ? "Edit My Dive Site" : "Add My Dive Site"}
                draft={affinityDraft}
                setDraft={setAffinityDraft}
                sites={sites}
                saving={saveAffinity.isPending}
                onSubmit={() => saveAffinity.mutate(affinityDraft)}
              />
              <ManagementList
                emptyTitle="No dive-site relationships yet"
                emptyDescription="Add a local, regular, instructor, operator, or interested relationship. This does not make you an Available Buddy."
              >
                {myAffinities.map((item) => (
                  <AffinityManagementCard
                    key={item.id}
                    item={item}
                    onEdit={() => setAffinityDraft(draftFromAffinity(item))}
                    onDelete={() => deleteAffinity.mutate(item)}
                    deleting={deleteAffinity.isPending}
                  />
                ))}
              </ManagementList>
            </>
          )}
        </TabsContent>
      </Tabs>
    </CommunityPageShell>
  );
}

function PresenceForm({ title, draft, setDraft, sites, saving, onSubmit }: {
  title: string;
  draft: PresenceDraft;
  setDraft: React.Dispatch<React.SetStateAction<PresenceDraft>>;
  sites: ExploreSiteCard[];
  saving: boolean;
  onSubmit: () => void;
}) {
  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Dive site"><SiteSelect sites={sites} value={draft.siteSlug || "all"} onValueChange={(value) => setDraft((current) => ({ ...current, siteSlug: value === "all" ? "" : value }))} /></Field>
          <Field label="Presence type"><Select value={draft.presenceType} onValueChange={(value) => setDraft((current) => ({ ...current, presenceType: value as DivePresenceType }))} items={PRESENCE_TYPES}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PRESENCE_TYPES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
          </Select></Field>
          <Field label="Visibility"><VisibilitySelect value={draft.visibility} onValueChange={(value) => setDraft((current) => ({ ...current, visibility: value }))} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.flexible} onChange={(event) => setDraft((current) => ({ ...current, flexible: event.target.checked }))} /> Flexible availability</label>
        {!draft.flexible ? <DateTimeRange draft={draft} setDraft={setDraft} /> : null}
        <Textarea placeholder="Note" value={draft.note ?? ""} onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.contactEnabled} onChange={(event) => setDraft((current) => ({ ...current, contactEnabled: event.target.checked }))} /> Allow contact</label>
        <Button disabled={saving || !draft.siteSlug} onClick={onSubmit}>{saving ? "Saving..." : "Save Dive Presence"}</Button>
      </CardContent>
    </Card>
  );
}

function AffinityForm({ title, draft, setDraft, sites, saving, onSubmit }: {
  title: string;
  draft: AffinityDraft;
  setDraft: React.Dispatch<React.SetStateAction<AffinityDraft>>;
  sites: ExploreSiteCard[];
  saving: boolean;
  onSubmit: () => void;
}) {
  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Dive site"><SiteSelect sites={sites} value={draft.siteSlug || "all"} onValueChange={(value) => setDraft((current) => ({ ...current, siteSlug: value === "all" ? "" : value }))} /></Field>
          <Field label="Relationship"><Select value={draft.relationship} onValueChange={(value) => setDraft((current) => ({ ...current, relationship: value as DiveSiteAffinityRelationship }))} items={RELATIONSHIPS}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{RELATIONSHIPS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
          </Select></Field>
          <Field label="Visibility"><VisibilitySelect value={draft.visibility} onValueChange={(value) => setDraft((current) => ({ ...current, visibility: value }))} /></Field>
        </div>
        <Textarea placeholder="Note" value={draft.note ?? ""} onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.contactEnabled} onChange={(event) => setDraft((current) => ({ ...current, contactEnabled: event.target.checked }))} /> Allow contact</label>
        <Button disabled={saving || !draft.siteSlug} onClick={onSubmit}>{saving ? "Saving..." : "Save My Dive Site"}</Button>
      </CardContent>
    </Card>
  );
}

function SiteSelect({ sites, value, onValueChange, includeAll = false }: {
  sites: ExploreSiteCard[];
  value: string;
  onValueChange: (value: string) => void;
  includeAll?: boolean;
}) {
  return (
    <Select value={value} onValueChange={(next) => onValueChange(next ?? "all")} items={[...(includeAll ? [{ value: "all", label: "All dive sites" }] : []), ...sites.map((site) => ({ value: site.slug, label: site.name }))]}>
      <SelectTrigger><SelectValue placeholder="Select dive site" /></SelectTrigger>
      <SelectContent>
        {includeAll ? <SelectItem value="all">All dive sites</SelectItem> : null}
        {sites.map((site) => <SelectItem key={site.id} value={site.slug}>{site.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function VisibilitySelect({ value, onValueChange }: {
  value: CreateDivePresenceRequest["visibility"];
  onValueChange: (value: CreateDivePresenceRequest["visibility"]) => void;
}) {
  return (
    <Select value={value} onValueChange={(next) => onValueChange(next as CreateDivePresenceRequest["visibility"])} items={VISIBILITY_ITEMS}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>{VISIBILITY_ITEMS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
    </Select>
  );
}

function DateTimeRange({ draft, setDraft }: {
  draft: PresenceDraft;
  setDraft: React.Dispatch<React.SetStateAction<PresenceDraft>>;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <DateTimeField label="Start" value={draft.startAt} onChange={(value) => setDraft((current) => ({ ...current, startAt: value }))} />
      <DateTimeField label="End" value={draft.endAt} min={dateFromLocalValue(draft.startAt)} onChange={(value) => setDraft((current) => ({ ...current, endAt: value }))} />
    </div>
  );
}

function DateTimeField({ label, value, min, onChange }: {
  label: string;
  value?: string;
  min?: Date;
  onChange: (value: string) => void;
}) {
  const selectedDate = dateFromLocalValue(value);
  const selectedTime = timeFromLocalValue(value);
  return (
    <Field label={label}>
      <div className="grid gap-2">
        <DatePicker value={selectedDate} min={min} placeholder={`Pick ${label.toLowerCase()} date`} onSelect={(date) => onChange(date ? localValueFromDateTime(date, selectedTime) : "")} />
        <Input type="time" value={selectedTime} onChange={(event) => onChange(selectedDate ? localValueFromDateTime(selectedDate, event.target.value) : "")} />
      </div>
    </Field>
  );
}

function PresenceCard({ item }: { item: DivePresenceItem }) {
  const name = item.displayName || item.username || "Freediver";
  return (
    <Card className="border-border/60 bg-background/80">
      <CardContent className="space-y-3 p-4 text-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <UserAvatar src={item.avatarUrl} displayName={name} />
            <div>
              <p className="font-medium text-foreground">{name}</p>
              <p className="text-xs text-muted-foreground">{item.diveSiteName ?? "Dive site"} · {item.diveSiteArea ?? "Philippines"}</p>
            </div>
          </div>
          <Badge>{labelForPresenceType(item.presenceType)}</Badge>
        </div>
        <Badge variant="outline">{availabilityLabel(item)}</Badge>
        {item.note ? <p className="text-muted-foreground">{item.note}</p> : null}
        {item.contactAllowed ? <Button size="sm" variant="outline"><MessageCircle className="mr-2 h-4 w-4" />Contact</Button> : null}
      </CardContent>
    </Card>
  );
}

function PresenceManagementCard({ item, onEdit, onCancel, cancelling }: {
  item: DivePresenceItem;
  onEdit: () => void;
  onCancel: () => void;
  cancelling: boolean;
}) {
  return (
    <Card><CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
      <div className="space-y-2 text-sm">
        <div className="flex flex-wrap gap-2"><Badge>{labelForPresenceType(item.presenceType)}</Badge><Badge variant="outline">{item.status}</Badge></div>
        <p className="font-medium">{item.diveSiteName}</p>
        <p className="text-muted-foreground">{availabilityLabel(item)}</p>
        {item.note ? <p className="text-muted-foreground">{item.note}</p> : null}
      </div>
      <div className="flex gap-2"><Button size="sm" variant="outline" onClick={onEdit}>Edit</Button><Button size="sm" variant="destructive" disabled={cancelling || !item.diveSiteSlug} onClick={onCancel}><Trash2 className="mr-2 h-4 w-4" />Cancel</Button></div>
    </CardContent></Card>
  );
}

function AffinityManagementCard({ item, onEdit, onDelete, deleting }: {
  item: DiveSiteAffinityItem;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <Card><CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
      <div className="space-y-2 text-sm">
        <div className="flex flex-wrap gap-2"><Badge>{titleCase(item.relationship)}</Badge><Badge variant="outline">{item.visibility}</Badge></div>
        <p className="font-medium">{item.diveSiteName}</p>
        {item.note ? <p className="text-muted-foreground">{item.note}</p> : null}
      </div>
      <div className="flex gap-2"><Button size="sm" variant="outline" onClick={onEdit}>Edit</Button><Button size="sm" variant="destructive" disabled={deleting || !item.diveSiteSlug} onClick={onDelete}><Trash2 className="mr-2 h-4 w-4" />Remove</Button></div>
    </CardContent></Card>
  );
}

function ManagementList({ children, emptyTitle, emptyDescription }: {
  children: React.ReactNode;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children;
  return <div className="space-y-3">{Array.isArray(items) && items.length === 0 ? <CommunityEmptyState title={emptyTitle} description={emptyDescription} /> : children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function StatusCard({ title, description }: { title: string; description: string }) {
  return <Card className="border-dashed"><CardContent className="p-4"><p className="font-medium">{title}</p><p className="text-sm text-muted-foreground">{description}</p></CardContent></Card>;
}

function SignInPrompt() {
  return <CommunityEmptyState title="Sign in required" description="Sign in to manage your Dive Presence and dive-site relationships." action={<SignInButton mode="modal"><Button>Sign in</Button></SignInButton>} />;
}

function presencePayload(draft: PresenceDraft): CreateDivePresenceRequest {
  return {
    presenceType: draft.presenceType,
    flexible: draft.flexible,
    startAt: draft.flexible ? undefined : rfc3339FromLocal(draft.startAt),
    endAt: draft.flexible ? undefined : rfc3339FromLocal(draft.endAt),
    visibility: draft.visibility,
    contactEnabled: draft.contactEnabled,
    note: draft.note?.trim() || undefined,
  };
}

function affinityPayload(draft: AffinityDraft): CreateDiveSiteAffinityRequest {
  return {
    relationship: draft.relationship,
    visibility: draft.visibility,
    contactEnabled: draft.contactEnabled,
    note: draft.note?.trim() || undefined,
  };
}

function draftFromPresence(item: DivePresenceItem): PresenceDraft {
  return {
    siteSlug: item.diveSiteSlug ?? "",
    presenceId: item.id,
    presenceType: item.presenceType,
    flexible: !item.startAt && !item.endAt,
    startAt: localInputFromRfc3339(item.startAt),
    endAt: localInputFromRfc3339(item.endAt),
    visibility: item.visibility,
    contactEnabled: item.contactEnabled,
    note: item.note ?? "",
  };
}

function draftFromAffinity(item: DiveSiteAffinityItem): AffinityDraft {
  return {
    siteSlug: item.diveSiteSlug ?? "",
    affinityId: item.id,
    relationship: item.relationship,
    visibility: item.visibility,
    contactEnabled: item.contactEnabled,
    note: item.note ?? "",
  };
}

function dateRangeForFilter(filter: DateFilter, customFrom?: Date, customTo?: Date) {
  const now = new Date();
  if (filter === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { dateFrom: start.toISOString(), dateTo: end.toISOString() };
  }
  if (filter === "weekend") {
    const start = new Date(now);
    const daysUntilSaturday = (6 - start.getDay() + 7) % 7;
    start.setDate(start.getDate() + daysUntilSaturday);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    end.setHours(23, 59, 59, 999);
    return { dateFrom: start.toISOString(), dateTo: end.toISOString() };
  }
  if (filter === "custom") {
    return { dateFrom: customFrom?.toISOString(), dateTo: customTo?.toISOString() };
  }
  return {};
}

function rfc3339FromLocal(value?: string) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function localInputFromRfc3339(value?: string) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return localValueFromDateTime(parsed, timeFromLocalValue(value));
}

function dateFromLocalValue(value?: string) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function timeFromLocalValue(value?: string) {
  const parsed = dateFromLocalValue(value);
  if (!parsed) return "08:00";
  return `${String(parsed.getHours()).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}`;
}

function localValueFromDateTime(date?: Date, time = "08:00") {
  if (!date) return "";
  const [hours = "08", minutes = "00"] = time.split(":");
  const next = new Date(date);
  next.setHours(Number(hours), Number(minutes), 0, 0);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}T${String(next.getHours()).padStart(2, "0")}:${String(next.getMinutes()).padStart(2, "0")}`;
}

function availabilityLabel(item: DivePresenceItem) {
  if (!item.startAt && !item.endAt) return "Flexible";
  if (item.startAt && item.endAt) return `${new Date(item.startAt).toLocaleString()} - ${new Date(item.endAt).toLocaleString()}`;
  if (item.startAt) return `From ${new Date(item.startAt).toLocaleString()}`;
  return `Until ${new Date(item.endAt ?? "").toLocaleString()}`;
}

function labelForPresenceType(value: string) {
  return value === "fun_dive" ? "Fun dive" : titleCase(value);
}

function titleCase(value: string) {
  return value.replace(/_/g, " ").split(" ").filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}
