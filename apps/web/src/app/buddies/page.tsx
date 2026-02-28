"use client";

import { useState } from "react";
import { SignInButton } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { ShieldCheck, Share2, UserRoundSearch } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TrustCard } from "@/components/trust-card";
import { useSession } from "@/features/auth/session";
import { buddyFinderApi } from "@/features/buddies/api/buddy-finder";
import { messagesApi } from "@/features/messages/api/messages";
import { useMyProfile, useSavedHub } from "@/features/profiles/hooks/queries";
import { useSaveUser, useUnsaveUser } from "@/features/profiles/hooks/mutations";
import { getApiErrorMessage } from "@/lib/http/api-error";

type IntentDraft = {
  area: string;
  intentType: "training" | "fun_dive" | "depth" | "pool" | "line_training";
  timeWindow: "today" | "weekend" | "specific_date";
  dateStart: string;
  dateEnd: string;
  note: string;
};

export default function BuddyFinderPage() {
  const session = useSession();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { data: meProfile } = useMyProfile();
  const { data: savedHub } = useSavedHub(session.status === "signed_in");
  const saveUserMutation = useSaveUser();
  const unsaveUserMutation = useUnsaveUser();
  const defaultArea = searchParams.get("area") ?? meProfile?.profile.homeArea ?? "";

  const [area, setArea] = useState(defaultArea);
  const [intentType, setIntentType] = useState<"" | "training" | "fun_dive" | "depth" | "pool" | "line_training">("");
  const [timeWindow, setTimeWindow] = useState<"" | "today" | "weekend" | "specific_date">("");
  const [newIntent, setNewIntent] = useState<IntentDraft>({
    area: defaultArea,
    intentType: "training",
    timeWindow: "weekend",
    dateStart: "",
    dateEnd: "",
    note: "",
  });

  const previewQuery = useQuery({
    queryKey: ["buddy-finder", "preview", area],
    queryFn: () => buddyFinderApi.preview(area || undefined),
  });

  const intentsQuery = useQuery({
    queryKey: ["buddy-finder", "intents", { area, intentType, timeWindow, signedIn: session.status === "signed_in" }],
    queryFn: () =>
      buddyFinderApi.listIntents({
        area: area || undefined,
        intentType: intentType || undefined,
        timeWindow: timeWindow || undefined,
        limit: 20,
      }),
    enabled: session.status === "signed_in",
  });

  const createIntentMutation = useMutation({
    mutationFn: buddyFinderApi.createIntent,
    onSuccess: () => {
      setNewIntent((current) => ({ ...current, note: "", dateStart: "", dateEnd: "" }));
      queryClient.invalidateQueries({ queryKey: ["buddy-finder"] });
    },
  });

  const messageMutation = useMutation({
    mutationFn: async (intentId: string) => {
      const entry = await buddyFinderApi.messageEntry(intentId);
      return messagesApi.createRequest(
        entry.recipientUserId,
        `Saw your Buddy Finder post for ${area || "your area"}. Still looking for a buddy?`,
      );
    },
  });

  const previewItems = previewQuery.data?.items ?? [];
  const memberItems = intentsQuery.data?.items ?? [];
  const savedUserIds = new Set((savedHub?.users ?? []).map((item) => item.userId));

  const shareBuddy = async (intentId: string) => {
    const url = `${window.location.origin}/buddy/${intentId}`;
    if (navigator.share) {
      await navigator.share({ title: "Freediving Philippines Buddy Finder", url });
      return;
    }
    await navigator.clipboard.writeText(url);
  };
  return (
    <div className="min-h-full bg-[linear-gradient(180deg,_#f7fbff_0%,_#eef6ff_100%)] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="grid gap-4 rounded-[28px] border border-sky-950/10 bg-white/90 p-6 shadow-sm lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4">
            <Badge className="w-fit rounded-full bg-sky-950 text-sky-50">Buddy Finder</Badge>
            <div className="space-y-2">
              <h1 className="max-w-2xl font-serif text-4xl tracking-tight text-sky-950">
                Find a nearby buddy without giving away more than you should.
              </h1>
              <p className="max-w-2xl text-sm text-zinc-600">
                Coarse location only. Trust ladder first. DM still goes through request preview and accept gating.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input placeholder="Area or city" value={area} onChange={(event) => setArea(event.target.value)} />
              <Select value={intentType || "all"} onValueChange={(value) => setIntentType(value === "all" ? "" : (value as typeof intentType))}>
                <SelectTrigger><SelectValue placeholder="Intent type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All intents</SelectItem>
                  <SelectItem value="training">Training</SelectItem>
                  <SelectItem value="fun_dive">Fun dive</SelectItem>
                  <SelectItem value="depth">Depth</SelectItem>
                  <SelectItem value="pool">Pool</SelectItem>
                  <SelectItem value="line_training">Line training</SelectItem>
                </SelectContent>
              </Select>
              <Select value={timeWindow || "all"} onValueChange={(value) => setTimeWindow(value === "all" ? "" : (value as typeof timeWindow))}>
                <SelectTrigger><SelectValue placeholder="Time window" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="weekend">Weekend</SelectItem>
                  <SelectItem value="specific_date">Specific date</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card className="rounded-[24px] border-sky-950/10 bg-[linear-gradient(180deg,_#edf7ff_0%,_#ffffff_100%)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sky-950">
                <UserRoundSearch className="h-5 w-5" />
                Signed-out preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                {previewItems.slice(0, 4).map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/80 bg-white/80 p-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge>{item.intentType.replace("_", " ")}</Badge>
                      <Badge variant="outline">{item.timeWindow.replace("_", " ")}</Badge>
                    </div>
                    <p className="mt-3 text-sm text-zinc-600 blur-[2px]">
                      {item.notePreview || "Buddy details stay limited until sign-in."}
                    </p>
                    <TrustCard
                      className="mt-3"
                      emailVerified={item.emailVerified}
                      phoneVerified={item.phoneVerified}
                      certLevel={item.certLevel}
                      buddyCount={item.buddyCount}
                      reportCount={item.reportCount}
                    />
                  </div>
                ))}
              </div>
              <div className="rounded-2xl bg-sky-950 p-4 text-sky-50">
                <p className="text-sm font-medium">{previewQuery.data?.count ?? 0} active intents in preview</p>
                <p className="mt-1 text-sm text-sky-100">Sign up to reveal full intent notes, dates, and message entry.</p>
                <div className="mt-3">
                  <SignInButton mode="modal">
                    <Button variant="secondary">Sign up to message and match</Button>
                  </SignInButton>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {session.status === "signed_in" ? (
          <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <Card className="rounded-[24px]">
              <CardHeader>
                <CardTitle>Post your intent</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Area</Label>
                  <Input value={newIntent.area} onChange={(event) => setNewIntent((current) => ({ ...current, area: event.target.value }))} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Intent type</Label>
                    <Select value={newIntent.intentType} onValueChange={(value) => setNewIntent((current) => ({ ...current, intentType: value as typeof current.intentType }))}>
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
                    <Select value={newIntent.timeWindow} onValueChange={(value) => setNewIntent((current) => ({ ...current, timeWindow: value as typeof current.timeWindow }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="weekend">Weekend</SelectItem>
                        <SelectItem value="specific_date">Specific date</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {newIntent.timeWindow === "specific_date" ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Date start</Label>
                      <Input type="date" value={newIntent.dateStart} onChange={(event) => setNewIntent((current) => ({ ...current, dateStart: event.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Date end</Label>
                      <Input type="date" value={newIntent.dateEnd} onChange={(event) => setNewIntent((current) => ({ ...current, dateEnd: event.target.value }))} />
                    </div>
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label>Short note</Label>
                  <Textarea value={newIntent.note} onChange={(event) => setNewIntent((current) => ({ ...current, note: event.target.value }))} />
                </div>
                <div className="rounded-2xl bg-zinc-100 p-4 text-sm text-zinc-600">
                  <p className="font-medium text-zinc-900">Safety defaults</p>
                  <p className="mt-1">Only coarse area is shown. Exact location, private history, and contact stay behind sign-in and DM request gating.</p>
                </div>
                <Button
                  disabled={createIntentMutation.isPending}
                  onClick={() =>
                    createIntentMutation.mutate({
                      area: newIntent.area,
                      intentType: newIntent.intentType,
                      timeWindow: newIntent.timeWindow,
                      dateStart: newIntent.dateStart || undefined,
                      dateEnd: newIntent.dateEnd || undefined,
                      note: newIntent.note || undefined,
                    })
                  }
                >
                  {createIntentMutation.isPending ? "Posting..." : "Post intent"}
                </Button>
                {createIntentMutation.error ? (
                  <p className="text-sm text-red-600">{getApiErrorMessage(createIntentMutation.error, "Failed to post intent")}</p>
                ) : null}
              </CardContent>
            </Card>

            <div className="space-y-4">
              {memberItems.map((item) => (
                <Card key={item.id} className="rounded-[24px] bg-white/90">
                  <CardContent className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-sky-950">{item.displayName || item.username}</p>
                        <p className="text-sm text-zinc-600">{item.homeArea || item.area}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge>{item.intentType.replace("_", " ")}</Badge>
                        <Badge variant="outline">{item.timeWindow.replace("_", " ")}</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-zinc-700">{item.note || "No note added."}</p>
                    <TrustCard
                      emailVerified={item.emailVerified}
                      phoneVerified={item.phoneVerified}
                      certLevel={item.certLevel}
                      buddyCount={item.buddyCount}
                      reportCount={item.reportCount}
                    />
                    <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                      <span>Posted {new Date(item.createdAt).toLocaleString()}</span>
                      {item.mutualBuddiesCount > 0 ? <span>{item.mutualBuddiesCount} mutual buddies</span> : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() =>
                          savedUserIds.has(item.authorAppUserId)
                            ? unsaveUserMutation.mutate(item.authorAppUserId)
                            : saveUserMutation.mutate(item.authorAppUserId)
                        }
                      >
                        {savedUserIds.has(item.authorAppUserId) ? "Saved" : "Save"}
                      </Button>
                      <Button variant="outline" onClick={() => void shareBuddy(item.id)}>
                        <Share2 className="mr-2 h-4 w-4" />
                        Share
                      </Button>
                      <Button disabled={messageMutation.isPending} onClick={() => messageMutation.mutate(item.id)}>
                        Message
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {messageMutation.error ? (
                <p className="text-sm text-red-600">{getApiErrorMessage(messageMutation.error, "Failed to start message request")}</p>
              ) : null}
              {messageMutation.isSuccess ? (
                <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
                  DM request preview sent. The recipient still has to accept unless you are already buddies.
                </div>
              ) : null}
            </div>
          </section>
        ) : (
          <Card className="rounded-[24px] border-dashed border-sky-200 bg-white/80">
            <CardContent className="flex items-center justify-between gap-4 p-6">
              <div>
                <p className="text-lg font-semibold text-sky-950">Want full Buddy Finder access?</p>
                <p className="text-sm text-zinc-600">Sign in to post intent, reveal full details, and start the DM request flow.</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <ShieldCheck className="h-4 w-4" />
                Coarse location by default
              </div>
            </CardContent>
          </Card>
        )}

        {(previewQuery.error || intentsQuery.error) ? (
          <p className="text-sm text-red-600">
            {getApiErrorMessage(previewQuery.error || intentsQuery.error, "Failed to load Buddy Finder")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
