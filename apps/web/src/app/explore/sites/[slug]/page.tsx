import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TrustCard } from "@/components/trust-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getExploreSiteBuddyPreviewServer, getExploreSiteBySlugServer } from "@/features/diveSpots/api/explore-v1.server";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const data = await getExploreSiteBySlugServer(slug);
    return {
      title: `${data.site.name} | Explore Dive Sites`,
      description: `${data.site.area}. ${data.site.lastConditionSummary || data.site.typicalConditions || "Real site conditions and trust signals."}`,
      openGraph: {
        title: data.site.name,
        description: `${data.site.area}. ${data.site.lastConditionSummary || data.site.typicalConditions || "Real site conditions and trust signals."}`,
      },
    };
  } catch {
    return {
      title: "Dive site not found",
    };
  }
}

export default async function ExploreSharePage({ params }: PageProps) {
  const { slug } = await params;

  try {
    const [data, buddyPreview] = await Promise.all([
      getExploreSiteBySlugServer(slug),
      getExploreSiteBuddyPreviewServer(slug).catch(() => null),
    ]);
    return (
      <div className="min-h-full bg-[linear-gradient(180deg,_#f4fbf8_0%,_#ffffff_100%)] px-4 py-10">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.2em] text-emerald-700">Freediving Philippines</p>
            <h1 className="font-serif text-4xl text-emerald-950">{data.site.name}</h1>
            <p className="text-zinc-600">{data.site.area}</p>
          </div>

          <Card className="rounded-[28px] border-white/80 bg-white/90">
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge>{data.site.difficulty}</Badge>
                <Badge variant="outline">{data.site.verificationStatus}</Badge>
                {data.site.depthMinM || data.site.depthMaxM ? (
                  <Badge variant="outline">
                    {data.site.depthMinM ?? "?"}m - {data.site.depthMaxM ?? "?"}m
                  </Badge>
                ) : null}
              </div>
              <CardTitle className="text-2xl text-emerald-950">Current value, not brochure filler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-zinc-700">
              <p>{data.site.lastConditionSummary || data.site.typicalConditions || "No public conditions summary yet."}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="font-medium text-emerald-950">Best season</p>
                  <p>{data.site.bestSeason || "Check local operator."}</p>
                </div>
                <div>
                  <p className="font-medium text-emerald-950">Access</p>
                  <p>{data.site.access || "Check local operator."}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-emerald-950">Recent conditions</h2>
            <div className="space-y-3">
              {data.updates.map((update) => (
                <div key={update.id} className="rounded-2xl border border-zinc-200 bg-white/90 p-4 text-sm text-zinc-700">
                  <div className="flex items-center justify-between gap-3 text-xs text-zinc-500">
                    <span>{update.authorDisplayName || "Community report"}</span>
                    <span>{new Date(update.occurredAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-2">{update.note}</p>
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
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-emerald-950">Find a buddy for this spot</h2>
              <Badge variant="outline">
                {buddyPreview?.sourceBreakdown.siteLinkedCount ?? 0} site-linked
              </Badge>
            </div>
            <div className="space-y-3">
              {(buddyPreview?.items ?? []).length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 bg-white/90 p-4 text-sm text-zinc-600">
                  Buddy preview will show here once someone posts for this site or area.
                </div>
              ) : (
                buddyPreview?.items.map((intent) => (
                  <div key={intent.id} className="rounded-2xl border border-zinc-200 bg-white/90 p-4 text-sm text-zinc-700">
                    <div className="flex flex-wrap gap-2">
                      <Badge>{intent.intentType.replace("_", " ")}</Badge>
                      <Badge variant="outline">{intent.timeWindow.replace("_", " ")}</Badge>
                    </div>
                    <p className="mt-3">{intent.notePreview || "Sign in to reveal full buddy details and contact flow."}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-500">
                      {intent.diveSiteId === data.site.id ? <span>Linked to this site</span> : <span>Area fallback</span>}
                    </div>
                    <TrustCard
                      className="mt-3"
                      emailVerified={intent.emailVerified}
                      phoneVerified={intent.phoneVerified}
                      certLevel={intent.certLevel}
                      buddyCount={intent.buddyCount}
                      reportCount={intent.reportCount}
                    />
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    );
  } catch {
    notFound();
  }
}
