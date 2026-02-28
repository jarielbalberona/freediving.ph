"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { TrustCard } from "@/components/trust-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { exploreApi } from "@/features/diveSpots/api/explore-v1";
import { getApiErrorMessage } from "@/lib/http/api-error";

export default function ExploreUpdatesPage() {
  const [area, setArea] = useState("");
  const [recency, setRecency] = useState<"24h" | "7d" | "30d">("7d");
  const updatesQuery = useQuery({
    queryKey: ["explore", "latest-updates", area],
    queryFn: () => exploreApi.listLatestUpdates({ area: area || undefined, limit: 20 }),
  });

  const items = (updatesQuery.data?.items ?? []).filter((item) => {
    const ageMs = Date.now() - new Date(item.occurredAt).getTime();
    if (recency === "24h") return ageMs <= 24 * 60 * 60 * 1000;
    if (recency === "7d") return ageMs <= 7 * 24 * 60 * 60 * 1000;
    return ageMs <= 30 * 24 * 60 * 60 * 1000;
  });

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,_#f6fbf9_0%,_#ffffff_100%)] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-[28px] border border-emerald-900/10 bg-white/90 p-6 shadow-sm">
          <Badge className="w-fit rounded-full bg-emerald-950 text-emerald-50">Conditions Pulse</Badge>
          <h1 className="mt-3 font-serif text-4xl tracking-tight text-emerald-950">Latest updates near you</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600">
            This is the utility layer. Fresh conditions, trusted enough to scan fast, without pretending stale content is useful.
          </p>
          <div className="mt-4 grid max-w-2xl gap-3 sm:grid-cols-2">
            <Input placeholder="Filter by area" value={area} onChange={(event) => setArea(event.target.value)} />
            <div className="flex gap-2">
              <button type="button" className={`rounded-md border px-3 py-2 text-sm ${recency === "24h" ? "bg-emerald-950 text-white" : "bg-white"}`} onClick={() => setRecency("24h")}>
                24h
              </button>
              <button type="button" className={`rounded-md border px-3 py-2 text-sm ${recency === "7d" ? "bg-emerald-950 text-white" : "bg-white"}`} onClick={() => setRecency("7d")}>
                7d
              </button>
              <button type="button" className={`rounded-md border px-3 py-2 text-sm ${recency === "30d" ? "bg-emerald-950 text-white" : "bg-white"}`} onClick={() => setRecency("30d")}>
                30d
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4">
          {items.map((item) => (
            <Card key={item.id} className="rounded-[24px] bg-white/90">
              <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl text-emerald-950">{item.siteName}</CardTitle>
                    <p className="text-sm text-zinc-600">{item.siteArea}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.conditionVisibilityM ? <Badge variant="outline">Vis {item.conditionVisibilityM}m</Badge> : null}
                    {item.conditionCurrent ? <Badge variant="outline">Current {item.conditionCurrent}</Badge> : null}
                    {item.conditionWaves ? <Badge variant="outline">Waves {item.conditionWaves}</Badge> : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-zinc-700">{item.note}</p>
                <p className="text-xs text-zinc-500">
                  {item.authorDisplayName || "Community report"} updated {new Date(item.occurredAt).toLocaleString()}
                </p>
                <TrustCard
                  emailVerified={item.authorTrust.emailVerified}
                  phoneVerified={item.authorTrust.phoneVerified}
                  certLevel={item.authorTrust.certLevel}
                  buddyCount={item.authorTrust.buddyCount}
                  reportCount={item.authorTrust.reportCount}
                />
                <a href={`/explore?area=${encodeURIComponent(item.siteArea)}`} className="inline-block text-sm font-medium text-emerald-800">
                  Open site list for this area
                </a>
              </CardContent>
            </Card>
          ))}
          {items.length === 0 && !updatesQuery.isLoading ? (
            <Card className="rounded-[24px] border-dashed">
              <CardContent className="p-6 text-sm text-zinc-600">
                No recent updates matched this filter yet. That is precisely why Conditions Pulse matters.
              </CardContent>
            </Card>
          ) : null}
        </section>

        {updatesQuery.error ? (
          <p className="text-sm text-red-600">{getApiErrorMessage(updatesQuery.error, "Failed to load latest updates")}</p>
        ) : null}
      </div>
    </div>
  );
}
