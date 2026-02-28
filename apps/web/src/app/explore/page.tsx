"use client";

import { useMemo, useState } from "react";
import { SignInButton, useUser } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Compass, MapPin, ShieldCheck, Share2 } from "lucide-react";
import type {
  CreateBuddyFinderIntentRequest,
  CreateExploreSiteUpdateRequest,
  ExploreSiteCard,
} from "@freediving.ph/types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { TrustCard } from "@/components/trust-card";
import { useSession } from "@/features/auth/session";
import { buddyFinderApi } from "@/features/buddies/api/buddy-finder";
import { exploreApi } from "@/features/diveSpots/api/explore-v1";
import { messagesApi } from "@/features/messages/api/messages";
import { useSavedHub } from "@/features/profiles/hooks/queries";
import { useSaveUser, useUnsaveUser } from "@/features/profiles/hooks/mutations";
import { getApiErrorMessage } from "@/lib/http/api-error";

const LAT_MIN = 4.5;
const LAT_MAX = 21.5;
const LNG_MIN = 116.5;
const LNG_MAX = 127.5;

const verificationTone: Record<ExploreSiteCard["verificationStatus"], string> = {
  community: "bg-zinc-100 text-zinc-700",
  instructor: "bg-amber-100 text-amber-900",
  moderator: "bg-sky-100 text-sky-900",
  verified: "bg-emerald-100 text-emerald-900",
};

export default function ExplorePage() {
  const { isSignedIn } = useUser();
  const session = useSession();
  const { data: savedHub } = useSavedHub(session.status === "signed_in");
  const saveUserMutation = useSaveUser();
  const unsaveUserMutation = useUnsaveUser();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState<"" | "easy" | "moderate" | "hard">("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [area, setArea] = useState(searchParams.get("area") ?? "");
  const [updateForm, setUpdateForm] = useState<CreateExploreSiteUpdateRequest>({
    note: "",
    conditionCurrent: "mild",
  });
  const [siteIntentDraft, setSiteIntentDraft] = useState<CreateBuddyFinderIntentRequest>({
    intentType: "training",
    timeWindow: "today",
    note: "",
  });

  const sitesQuery = useQuery({
    queryKey: ["explore", "sites", { area, difficulty, verifiedOnly, search }],
    queryFn: () =>
      exploreApi.listSites({
        area: area || undefined,
        difficulty: difficulty || undefined,
        verifiedOnly,
        search: search || undefined,
        limit: 30,
      }),
  });

  const selectedDetailQuery = useQuery({
    queryKey: ["explore", "site", selectedSlug],
    queryFn: () => exploreApi.getSiteBySlug(selectedSlug!),
    enabled: Boolean(selectedSlug),
  });

  const siteBuddyPreviewQuery = useQuery({
    queryKey: ["explore", "site", "buddy-preview", selectedSlug],
    queryFn: () => exploreApi.getSiteBuddyPreview(selectedSlug!, 6),
    enabled: Boolean(selectedSlug) && session.status !== "signed_in",
  });

  const siteBuddyIntentsQuery = useQuery({
    queryKey: ["explore", "site", "buddy-intents", selectedSlug],
    queryFn: () => exploreApi.getSiteBuddyIntents(selectedSlug!, undefined, 8),
    enabled: Boolean(selectedSlug) && session.status === "signed_in",
  });

  const saveMutation = useMutation({
    mutationFn: async ({ siteId, isSaved }: { siteId: string; isSaved: boolean }) => {
      if (isSaved) {
        await exploreApi.unsaveSite(siteId);
        return false;
      }
      await exploreApi.saveSite(siteId);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["explore", "sites"] });
      queryClient.invalidateQueries({ queryKey: ["explore", "site", selectedSlug] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ siteId, payload }: { siteId: string; payload: CreateExploreSiteUpdateRequest }) =>
      exploreApi.createUpdate(siteId, payload),
    onSuccess: () => {
      setUpdateForm({ note: "", conditionCurrent: "mild" });
      queryClient.invalidateQueries({ queryKey: ["explore", "sites"] });
      queryClient.invalidateQueries({ queryKey: ["explore", "site", selectedSlug] });
    },
  });

  const createIntentMutation = useMutation({
    mutationFn: buddyFinderApi.createIntent,
    onSuccess: () => {
      setSiteIntentDraft({
        intentType: "training",
        timeWindow: "today",
        note: "",
      });
      queryClient.invalidateQueries({ queryKey: ["explore", "site", "buddy-preview", selectedSlug] });
      queryClient.invalidateQueries({ queryKey: ["explore", "site", "buddy-intents", selectedSlug] });
      queryClient.invalidateQueries({ queryKey: ["buddy-finder"] });
    },
  });

  const messageMutation = useMutation({
    mutationFn: async ({ intentId, siteName }: { intentId: string; siteName: string }) => {
      const entry = await buddyFinderApi.messageEntry(intentId);
      return messagesApi.createRequest(
        entry.recipientUserId,
        `Saw your buddy intent for ${siteName}. Still looking for a dive buddy?`,
      );
    },
  });

  const items = sitesQuery.data?.items ?? [];
  const areas = useMemo(() => Array.from(new Set(items.map((item) => item.area))).sort(), [items]);
  const selectedSite = selectedDetailQuery.data?.site;
  const selectedBuddyPreview = siteBuddyPreviewQuery.data;
  const selectedBuddyIntents = siteBuddyIntentsQuery.data;
  const savedUserIds = new Set((savedHub?.users ?? []).map((item) => item.userId));

  const shareSite = async (slug: string) => {
    const url = `${window.location.origin}/explore/sites/${slug}`;
    if (navigator.share) {
      await navigator.share({ title: "Freediving Philippines", url });
      return;
    }
    await navigator.clipboard.writeText(url);
  };

  const shareBuddy = async (intentId: string) => {
    const url = `${window.location.origin}/buddy/${intentId}`;
    if (navigator.share) {
      await navigator.share({ title: "Freediving Philippines Buddy Finder", url });
      return;
    }
    await navigator.clipboard.writeText(url);
  };

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(6,95,70,0.12),_transparent_35%),linear-gradient(180deg,_#f8fafc_0%,_#eef6f4_100%)] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="grid gap-4 rounded-[28px] border border-emerald-950/10 bg-white/90 p-6 shadow-sm lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <Badge className="w-fit rounded-full bg-emerald-950 text-emerald-50">Explore Dive Sites</Badge>
            <div className="space-y-2">
              <h1 className="max-w-2xl font-serif text-4xl tracking-tight text-emerald-950">
                Find a real site with real conditions before the scroll fatigue starts.
              </h1>
              <p className="max-w-2xl text-sm text-zinc-600">
                Signed-out users can browse verified spots, recent conditions, and trust signals in under a minute.
              </p>
              <a href="/explore/updates" className="inline-flex items-center gap-2 text-sm font-medium text-emerald-800">
                <Compass className="h-4 w-4" />
                Latest updates near you
              </a>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <Input placeholder="Search site or area" value={search} onChange={(event) => setSearch(event.target.value)} />
              <Select value={area || "all"} onValueChange={(value) => setArea(!value || value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Area" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All areas</SelectItem>
                  {areas.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={difficulty || "all"} onValueChange={(value) => setDifficulty(value === "all" ? "" : (value as typeof difficulty))}>
                <SelectTrigger>
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All levels</SelectItem>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
              <Button variant={verifiedOnly ? "default" : "outline"} onClick={() => setVerifiedOnly((current) => !current)}>
                Verified only
              </Button>
            </div>
          </div>

          <div className="rounded-[24px] border border-emerald-900/10 bg-[linear-gradient(180deg,_#dbf4ec_0%,_#f5fbf8_100%)] p-4">
            <div className="relative h-[320px] overflow-hidden rounded-[20px] border border-white/80 bg-[linear-gradient(180deg,_#d7efe8_0%,_#f8fcfb_100%)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,_rgba(16,185,129,0.18),_transparent_22%),radial-gradient(circle_at_64%_58%,_rgba(14,165,233,0.18),_transparent_18%),linear-gradient(180deg,_rgba(255,255,255,0.7),_rgba(255,255,255,0.2))]" />
              {items.map((site) => {
                if (typeof site.latitude !== "number" || typeof site.longitude !== "number") return null;
                const top = `${100 - (((site.latitude - LAT_MIN) / (LAT_MAX - LAT_MIN)) * 100)}%`;
                const left = `${((site.longitude - LNG_MIN) / (LNG_MAX - LNG_MIN)) * 100}%`;
                return (
                  <button
                    key={site.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ top, left }}
                    onClick={() => setSelectedSlug(site.slug)}
                    type="button"
                  >
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-700 shadow-[0_0_0_6px_rgba(16,185,129,0.16)]" />
                  </button>
                );
              })}
              <div className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs text-zinc-600">
                Marker board from seeded PH coordinates
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {sitesQuery.isLoading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="rounded-[24px] border-white/70 bg-white/80">
                <CardContent className="h-48 animate-pulse p-6" />
              </Card>
            ))
          ) : (
            items.map((site) => (
              <Card key={site.id} className="rounded-[24px] border-white/70 bg-white/90 shadow-sm">
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-xl text-emerald-950">{site.name}</CardTitle>
                      <p className="mt-1 flex items-center gap-1 text-sm text-zinc-600">
                        <MapPin className="h-4 w-4" />
                        {site.area}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${verificationTone[site.verificationStatus]}`}>
                      {site.verificationStatus}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="capitalize">{site.difficulty}</Badge>
                    {(site.depthMinM || site.depthMaxM) ? (
                      <Badge variant="outline">
                        {site.depthMinM ?? "?"}m - {site.depthMaxM ?? "?"}m
                      </Badge>
                    ) : null}
                    {site.hazards.slice(0, 3).map((hazard) => (
                      <Badge key={hazard} variant="secondary">
                        {hazard}
                      </Badge>
                    ))}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-zinc-700">
                    <p className="font-medium text-emerald-950">Latest conditions</p>
                    <p className="mt-1 line-clamp-3">{site.lastConditionSummary || "No recent conditions yet."}</p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>Updated {new Date(site.lastUpdatedAt).toLocaleString()}</span>
                    <span>{site.recentUpdateCount} recent reports</span>
                  </div>
                  <div className="flex gap-2">
                    {isSignedIn ? (
                      <Button
                        variant="outline"
                        onClick={() =>
                          saveMutation.mutate({
                            siteId: site.id,
                            isSaved: site.isSaved,
                          })
                        }
                      >
                        {site.isSaved ? "Saved" : "Save"}
                      </Button>
                    ) : (
                      <SignInButton mode="modal">
                        <Button variant="outline">Save</Button>
                      </SignInButton>
                    )}
                    <Button className="flex-1" onClick={() => setSelectedSlug(site.slug)}>
                      Open site
                    </Button>
                    <Button variant="outline" onClick={() => void shareSite(site.slug)}>
                      Share
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </section>

        <Sheet open={Boolean(selectedSlug)} onOpenChange={(open) => !open && setSelectedSlug(null)}>
          <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
            <SheetHeader>
              <SheetTitle>{selectedSite?.name ?? "Dive site"}</SheetTitle>
            </SheetHeader>
            {selectedDetailQuery.isLoading ? <p className="py-8 text-sm text-zinc-500">Loading site details...</p> : null}
            {selectedSite ? (
              <div className="space-y-6 py-4">
                <div className="space-y-3 rounded-3xl bg-emerald-50 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="capitalize">{selectedSite.difficulty}</Badge>
                    <Badge variant="outline">{selectedSite.area}</Badge>
                    <Badge variant="outline" className="capitalize">{selectedSite.verificationStatus}</Badge>
                  </div>
                  <p className="text-sm text-zinc-700">{selectedSite.typicalConditions || selectedSite.lastConditionSummary || "No conditions summary yet."}</p>
                  <div className="grid gap-3 text-sm text-zinc-700 sm:grid-cols-2">
                    <div>
                      <p className="font-medium text-emerald-950">Best season</p>
                      <p>{selectedSite.bestSeason || "Ask local operator."}</p>
                    </div>
                    <div>
                      <p className="font-medium text-emerald-950">Access</p>
                      <p>{selectedSite.access || "Check local operator."}</p>
                    </div>
                    <div>
                      <p className="font-medium text-emerald-950">Fees</p>
                      <p>{selectedSite.fees || "Varies by operator."}</p>
                    </div>
                    <div>
                      <p className="font-medium text-emerald-950">Contact</p>
                      <p>{selectedSite.contactInfo || "No contact provided."}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {isSignedIn ? (
                    <Button
                      onClick={() =>
                        saveMutation.mutate({
                          siteId: selectedSite.id,
                          isSaved: Boolean(sitesQuery.data?.items.find((item) => item.id === selectedSite.id)?.isSaved),
                        })
                      }
                    >
                      {sitesQuery.data?.items.find((item) => item.id === selectedSite.id)?.isSaved ? "Saved" : "Save site"}
                    </Button>
                  ) : (
                    <SignInButton mode="modal">
                      <Button>Save site</Button>
                    </SignInButton>
                  )}
                  <Button variant="outline" onClick={() => void shareSite(selectedSite.slug)}>
                    Share preview
                  </Button>
                  <Button variant="ghost" onClick={() => window.open(`/explore/sites/${selectedSite.slug}`, "_blank", "noopener,noreferrer")}>
                    Open share page
                  </Button>
                </div>

                <div className="space-y-4 rounded-3xl border border-sky-100 bg-sky-50/70 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-sky-950">Find a buddy for this spot</h2>
                      <p className="text-sm text-zinc-600">
                        Site-linked intents show first. If that is thin, area-level intents fill the gap.
                      </p>
                    </div>
                    {session.status === "signed_in" ? (
                      <Badge variant="outline">
                        {selectedBuddyIntents?.sourceBreakdown.siteLinkedCount ?? 0} site-linked
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        {selectedBuddyPreview?.sourceBreakdown.siteLinkedCount ?? 0} site-linked
                      </Badge>
                    )}
                  </div>

                  {session.status === "signed_in" ? (
                    <div className="space-y-3">
                      {(selectedBuddyIntents?.items ?? []).length === 0 ? (
                        <p className="rounded-2xl bg-white/90 p-4 text-sm text-zinc-600">
                          No active buddy intents yet for this spot. Post one and stop waiting for the app to feel alive by accident.
                        </p>
                      ) : (
                        (selectedBuddyIntents?.items ?? []).map((intent) => (
                          <div key={intent.id} className="rounded-2xl border border-white/80 bg-white/90 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-medium text-sky-950">{intent.displayName}</p>
                                <p className="text-xs text-zinc-500">{intent.area}</p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge>{intent.intentType.replace("_", " ")}</Badge>
                                <Badge variant="outline">{intent.timeWindow.replace("_", " ")}</Badge>
                              </div>
                            </div>
                            <p className="mt-3 text-sm text-zinc-700">{intent.note || "No note provided."}</p>
                            <TrustCard
                              className="mt-3"
                              emailVerified={intent.emailVerified}
                              phoneVerified={intent.phoneVerified}
                              certLevel={intent.certLevel}
                              buddyCount={intent.buddyCount}
                              reportCount={intent.reportCount}
                            />
                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-500">
                              {intent.diveSiteId === selectedSite.id ? <span>Linked to this site</span> : <span>Area fallback</span>}
                            </div>
                            <div className="mt-4 flex flex-wrap justify-end gap-2">
                              <Button
                                variant="outline"
                                onClick={() =>
                                  savedUserIds.has(intent.authorAppUserId)
                                    ? unsaveUserMutation.mutate(intent.authorAppUserId)
                                    : saveUserMutation.mutate(intent.authorAppUserId)
                                }
                              >
                                {savedUserIds.has(intent.authorAppUserId) ? "Saved" : "Save"}
                              </Button>
                              <Button variant="outline" onClick={() => void shareBuddy(intent.id)}>
                                <Share2 className="mr-2 h-4 w-4" />
                                Share
                              </Button>
                              <Button
                                disabled={messageMutation.isPending}
                                onClick={() => messageMutation.mutate({ intentId: intent.id, siteName: selectedSite.name })}
                              >
                                {messageMutation.isPending ? "Sending..." : "Message"}
                              </Button>
                            </div>
                          </div>
                        ))
                      )}

                      <div className="rounded-2xl border border-white/80 bg-white/90 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-sky-950">Post intent for this site</p>
                            <p className="text-sm text-zinc-600">Area is fixed to {selectedSite.area}. No exact coordinates collected.</p>
                          </div>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Intent type</Label>
                            <Select
                              value={siteIntentDraft.intentType}
                              onValueChange={(value) =>
                                setSiteIntentDraft((current) => ({
                                  ...current,
                                  intentType: value as NonNullable<CreateBuddyFinderIntentRequest["intentType"]>,
                                }))
                              }
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="training">Training</SelectItem>
                                <SelectItem value="fun_dive">Fun dive</SelectItem>
                                <SelectItem value="depth">Depth</SelectItem>
                                <SelectItem value="pool">Pool</SelectItem>
                                <SelectItem value="line_training">Line training</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Time window</Label>
                            <Select
                              value={siteIntentDraft.timeWindow}
                              onValueChange={(value) =>
                                setSiteIntentDraft((current) => ({
                                  ...current,
                                  timeWindow: value as NonNullable<CreateBuddyFinderIntentRequest["timeWindow"]>,
                                }))
                              }
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="weekend">Weekend</SelectItem>
                                <SelectItem value="specific_date">Specific date</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="mt-3 space-y-2">
                          <Label>Short note</Label>
                          <Textarea
                            value={siteIntentDraft.note ?? ""}
                            onChange={(event) =>
                              setSiteIntentDraft((current) => ({
                                ...current,
                                note: event.target.value,
                              }))
                            }
                            placeholder="Training, relaxed fun dive, weekend session. Keep it short."
                          />
                        </div>
                        <div className="mt-4 flex justify-end">
                          <Button
                            disabled={createIntentMutation.isPending}
                            onClick={() =>
                              createIntentMutation.mutate({
                                ...siteIntentDraft,
                                area: selectedSite.area,
                                diveSiteId: selectedSite.id,
                              })
                            }
                          >
                            {createIntentMutation.isPending ? "Posting..." : "Post intent for this site"}
                          </Button>
                        </div>
                        {createIntentMutation.error ? (
                          <p className="mt-3 text-sm text-red-600">{getApiErrorMessage(createIntentMutation.error, "Failed to post intent")}</p>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(selectedBuddyPreview?.items ?? []).length === 0 ? (
                        <p className="rounded-2xl bg-white/90 p-4 text-sm text-zinc-600">
                          No active site preview yet. Area fallback will appear here as soon as someone posts.
                        </p>
                      ) : (
                        (selectedBuddyPreview?.items ?? []).map((intent) => (
                          <div key={intent.id} className="rounded-2xl border border-white/80 bg-white/90 p-4">
                            <div className="flex flex-wrap gap-2">
                              <Badge>{intent.intentType.replace("_", " ")}</Badge>
                              <Badge variant="outline">{intent.timeWindow.replace("_", " ")}</Badge>
                            </div>
                            <p className="mt-3 text-sm text-zinc-700">{intent.notePreview || "Sign in to reveal full buddy details and contact flow."}</p>
                            <TrustCard
                              className="mt-3"
                              emailVerified={intent.emailVerified}
                              phoneVerified={intent.phoneVerified}
                              certLevel={intent.certLevel}
                              buddyCount={intent.buddyCount}
                              reportCount={intent.reportCount}
                            />
                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-500">
                              {intent.diveSiteId === selectedSite.id ? <span>Linked to this site</span> : <span>Area fallback</span>}
                            </div>
                          </div>
                        ))
                      )}
                      <div className="rounded-2xl bg-sky-950 p-4 text-sky-50">
                        <p className="text-sm font-medium">Sign in to message and post a site-linked buddy intent.</p>
                        <p className="mt-1 text-sm text-sky-100">DM still goes through request preview and accept gating. Safety is not optional here.</p>
                        <div className="mt-3 flex gap-2">
                          <SignInButton mode="modal">
                            <Button variant="secondary">Sign in to message</Button>
                          </SignInButton>
                          <SignInButton mode="modal">
                            <Button variant="secondary">Post intent for this site</Button>
                          </SignInButton>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-emerald-950">Conditions updates</h2>
                    <span className="text-xs text-zinc-500">{selectedDetailQuery.data?.updates.length ?? 0} shown</span>
                  </div>
                  <div className="space-y-3">
                    {selectedDetailQuery.data?.updates.map((update) => (
                      <div key={update.id} className="rounded-2xl border border-zinc-200 p-4">
                        <div className="flex items-center justify-between gap-3 text-xs text-zinc-500">
                          <span className="font-medium text-zinc-800">{update.authorDisplayName || "Community report"}</span>
                          <span>{new Date(update.occurredAt).toLocaleString()}</span>
                        </div>
                        <p className="mt-2 text-sm text-zinc-700">{update.note}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-500">
                          {update.conditionVisibilityM ? <span>Vis {update.conditionVisibilityM}m</span> : null}
                          {update.conditionCurrent ? <span>Current {update.conditionCurrent}</span> : null}
                          {update.conditionWaves ? <span>Waves {update.conditionWaves}</span> : null}
                          {update.conditionTempC ? <span>{update.conditionTempC}C</span> : null}
                        </div>
                        <TrustCard
                          className="mt-3"
                          emailVerified={update.authorTrust.emailVerified}
                          phoneVerified={update.authorTrust.phoneVerified}
                          certLevel={update.authorTrust.certLevel}
                          buddyCount={update.authorTrust.buddyCount}
                          reportCount={update.authorTrust.reportCount}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 rounded-3xl border border-zinc-200 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-emerald-950">Post an update</h2>
                      <p className="text-sm text-zinc-600">Conditions only. No exact buddy coordinates, no nonsense.</p>
                    </div>
                    {!isSignedIn ? <ShieldCheck className="h-5 w-5 text-zinc-400" /> : null}
                  </div>
                  {!isSignedIn ? (
                    <SignInButton mode="modal">
                      <Button>Sign in to post update</Button>
                    </SignInButton>
                  ) : (
                    <div className="space-y-3">
                      <Textarea
                        value={updateForm.note}
                        onChange={(event) => setUpdateForm((current) => ({ ...current, note: event.target.value }))}
                        placeholder="What conditions did you actually observe?"
                      />
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-2">
                          <Label>Current</Label>
                          <Select
                            value={updateForm.conditionCurrent ?? "mild"}
                            onValueChange={(value) => setUpdateForm((current) => ({ ...current, conditionCurrent: value as "none" | "mild" | "strong" }))}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="mild">Mild</SelectItem>
                              <SelectItem value="strong">Strong</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Visibility (m)</Label>
                          <Input
                            type="number"
                            value={updateForm.conditionVisibilityM ?? ""}
                            onChange={(event) =>
                              setUpdateForm((current) => ({
                                ...current,
                                conditionVisibilityM: event.target.value ? Number(event.target.value) : undefined,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Temp (C)</Label>
                          <Input
                            type="number"
                            value={updateForm.conditionTempC ?? ""}
                            onChange={(event) =>
                              setUpdateForm((current) => ({
                                ...current,
                                conditionTempC: event.target.value ? Number(event.target.value) : undefined,
                              }))
                            }
                          />
                        </div>
                      </div>
                      <Button
                        disabled={updateMutation.isPending || !updateForm.note.trim()}
                        onClick={() =>
                          updateMutation.mutate({
                            siteId: selectedSite.id,
                            payload: updateForm,
                          })
                        }
                      >
                        {updateMutation.isPending ? "Posting..." : "Post update"}
                      </Button>
                      {updateMutation.error ? (
                        <p className="text-sm text-red-600">{getApiErrorMessage(updateMutation.error, "Failed to post update")}</p>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </SheetContent>
        </Sheet>

        {sitesQuery.error ? <p className="text-sm text-red-600">{getApiErrorMessage(sitesQuery.error, "Failed to load dive sites")}</p> : null}
      </div>
    </div>
  );
}
