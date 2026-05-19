import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { UsernameLink } from "@/components/common/UsernameLink";
import { TrustCard } from "@/components/trust-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  getExploreSiteBySlugServer,
  getExploreSiteAffinitiesServer,
  getExploreSiteCommunityPostsServer,
  getExploreSitePresenceServer,
  getExploreSiteRelatedServer,
  getExploreSiteReviewsServer,
} from "@/features/diveSpots/api/explore-v1.server";
import { DiveSiteLikeButton } from "@/features/explore/components/DiveSiteLikeButton";
import BackToExploreButton from "./back-to-explore-button";
import { DiveSiteRelatedTabs } from "./dive-site-related-tabs";

type PageProps = {
  params: Promise<{ slug: string }>;
};

const titleCase = (value: string) =>
  value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

const verificationLabel = (value: string) => {
  switch (value) {
    case "verified":
      return "Verified";
    case "moderator":
      return "Checked by team";
    case "instructor":
      return "Instructor noted";
    case "community":
    default:
      return "Community shared";
  }
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
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
    const [data, related, presencePage, affinitiesPage, communityPostsPage, reviewsPage] =
      await Promise.all([
      getExploreSiteBySlugServer(slug),
      getExploreSiteRelatedServer(slug).catch(() => null),
      getExploreSitePresenceServer(slug, 6).catch(() => null),
      getExploreSiteAffinitiesServer(slug, 6).catch(() => null),
      getExploreSiteCommunityPostsServer(slug, undefined, 6).catch(() => null),
      getExploreSiteReviewsServer(slug, 6).catch(() => null),
    ]);
    return (
      <div className="min-h-full bg-gradient-to-b from-muted/30 to-background px-4 py-2">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="space-y-3">
            <BackToExploreButton />
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
              Freediving Philippines
            </p>
            <h1 className="font-serif text-4xl text-foreground">
              {data.site.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-muted-foreground">{data.site.area}</p>
              <DiveSiteLikeButton
                siteId={data.site.id}
                likeCount={data.site.likeCount}
                viewerHasLiked={data.site.viewerHasLiked}
              />
              <Link
                href={`/explore/sites/${data.site.slug}/suggest-edit`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Suggest edit
              </Link>
            </div>
          </div>

          <Card>
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge>{titleCase(data.site.difficulty)}</Badge>
                <Badge variant="outline">
                  {verificationLabel(data.site.verificationStatus)}
                </Badge>
                {data.site.depthMinM || data.site.depthMaxM ? (
                  <Badge variant="outline">
                    {data.site.depthMinM ?? "?"}m - {data.site.depthMaxM ?? "?"}
                    m
                  </Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                {data.site.lastConditionSummary ||
                  data.site.typicalConditions ||
                  "No recent condition reports yet."}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="font-medium text-foreground">Best season</p>
                  <p>{data.site.bestSeason || "Check local operator."}</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Access</p>
                  <p>{data.site.access || "Check local operator."}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              Recent conditions
            </h2>
            <div className="space-y-3">
              {data.updates.map((update) => (
                <Card key={update.id} size="sm">
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <UsernameLink
                        username={update.authorDisplayName}
                        className="text-muted-foreground"
                        fallback="Community report"
                      />
                      <span>
                        {new Date(update.occurredAt).toLocaleString()}
                      </span>
                    </div>
                    <p>{update.note}</p>
                    <TrustCard
                      emailVerified={update.authorTrust.emailVerified}
                      phoneVerified={update.authorTrust.phoneVerified}
                      certLevel={update.authorTrust.certLevel}
                      buddyCount={update.authorTrust.buddyCount}
                      reportCount={update.authorTrust.reportCount}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <DiveSiteRelatedTabs
            siteId={data.site.id}
            slug={slug}
            counts={
              related?.counts ?? {
                availableBuddyCount: 0,
                localRegularCount: 0,
                communityPostCount: 0,
                communityPosts: 0,
                recentConditions: data.updates.length,
              }
            }
            availableBuddies={
              presencePage?.items ?? related?.previews.availableBuddies ?? []
            }
            localRegulars={
              affinitiesPage?.items ?? related?.previews.localRegulars ?? []
            }
            communityPosts={
              communityPostsPage?.items ?? related?.previews.communityPosts ?? []
            }
            communityNextCursor={communityPostsPage?.nextCursor}
            reviews={reviewsPage?.items ?? related?.previews.reviews ?? []}
            reviewCount={
              reviewsPage?.reviewCount ?? related?.counts.reviewCount ?? 0
            }
            averageRating={
              reviewsPage?.averageRating ?? related?.counts.averageRating ?? 0
            }
          />
        </div>
      </div>
    );
  } catch {
    notFound();
  }
}
