"use client";

import { useState } from "react";

import { AuthGuard } from "@/components/auth/guard";
import { TrustCard } from "@/components/trust-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSavedHub } from "@/features/profiles/hooks/queries";
import { getApiErrorMessage } from "@/lib/http/api-error";

export default function SavedPage() {
  const [tab, setTab] = useState("sites");
  const savedQuery = useSavedHub(true);
  const sites = savedQuery.data?.sites ?? [];
  const users = savedQuery.data?.users ?? [];

  return (
    <AuthGuard title="Sign in to access your saved hub" description="Saving is the planning layer for MVP1, so it stays member-only.">
      <div className="min-h-full bg-[linear-gradient(180deg,_#fafaf9_0%,_#ffffff_100%)] px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <section className="rounded-[28px] border border-zinc-900/10 bg-white/90 p-6 shadow-sm">
            <Badge className="w-fit rounded-full bg-zinc-950 text-zinc-50">Saved Hub</Badge>
            <h1 className="mt-3 font-serif text-4xl tracking-tight text-zinc-950">Plan now, decide later</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-600">
              This is the shortlist. Sites for the spot. People for the plan. If users do not come back here, the save feature is just decoration.
            </p>
          </section>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="sites">Saved Sites</TabsTrigger>
              <TabsTrigger value="users">Saved Buddies</TabsTrigger>
            </TabsList>

            <TabsContent value="sites" className="space-y-4">
              {sites.map((site) => (
                <Card key={site.id} className="rounded-[24px] bg-white/90">
                  <CardHeader>
                    <CardTitle className="text-xl text-zinc-950">{site.name}</CardTitle>
                    <p className="text-sm text-zinc-600">{site.area}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="capitalize">{site.difficulty}</Badge>
                      <Badge variant="outline">Saved {new Date(site.savedAt).toLocaleString()}</Badge>
                    </div>
                    <p className="text-sm text-zinc-700">{site.lastConditionSummary || "No current public summary yet."}</p>
                    <a href={`/explore/sites/${site.slug}`} className="inline-block text-sm font-medium text-zinc-900">
                      Open share page
                    </a>
                  </CardContent>
                </Card>
              ))}
              {sites.length === 0 && !savedQuery.isLoading ? (
                <Card className="rounded-[24px] border-dashed">
                  <CardContent className="p-6 text-sm text-zinc-600">No saved sites yet. Save the ones you would actually revisit.</CardContent>
                </Card>
              ) : null}
            </TabsContent>

            <TabsContent value="users" className="space-y-4">
              {users.map((user) => (
                <Card key={user.userId} className="rounded-[24px] bg-white/90">
                  <CardHeader>
                    <CardTitle className="text-xl text-zinc-950">{user.displayName || user.username}</CardTitle>
                    <p className="text-sm text-zinc-600">{user.homeArea || "Area not shared"}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <TrustCard
                      emailVerified={user.emailVerified}
                      phoneVerified={user.phoneVerified}
                      certLevel={user.certLevel}
                      buddyCount={user.buddyCount}
                      reportCount={user.reportCount}
                    />
                    <p className="text-xs text-zinc-500">Saved {new Date(user.savedAt).toLocaleString()}</p>
                  </CardContent>
                </Card>
              ))}
              {users.length === 0 && !savedQuery.isLoading ? (
                <Card className="rounded-[24px] border-dashed">
                  <CardContent className="p-6 text-sm text-zinc-600">No saved buddies yet. Save a shortlist when someone looks legit.</CardContent>
                </Card>
              ) : null}
            </TabsContent>
          </Tabs>

          {savedQuery.error ? (
            <p className="text-sm text-red-600">{getApiErrorMessage(savedQuery.error, "Failed to load saved hub")}</p>
          ) : null}
        </div>
      </div>
    </AuthGuard>
  );
}
