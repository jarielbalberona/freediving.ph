import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache, type ReactNode } from "react";
import {
  CalendarDays,
  CircleDollarSign,
  Compass,
  Flag,
  Gauge,
  Info,
  MapPin,
  Radio,
  ShieldCheck,
  TriangleAlert,
  Waves,
} from "lucide-react";
import { DEFAULT_TIMEZONE } from "@freediving.ph/config";
import type { ExploreSiteDetailResponse } from "@freediving.ph/types";

import { UsernameLink } from "@/components/common/UsernameLink";
import { TrustCard } from "@/components/trust-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getExploreSiteBySlugServer,
  getExploreSiteAffinitiesServer,
  getExploreSiteCommunityPostsServer,
  getExploreSitePresenceServer,
  getExploreSiteRelatedServer,
  getExploreSiteReviewsServer,
} from "@/features/diveSpots/api/explore-v1.server";
import { DiveSiteLikeButton } from "@/features/explore/components/DiveSiteLikeButton";
import { FphgoFetchError } from "@/lib/api/fphgo-fetch-client";
import BackToExploreButton from "./back-to-explore-button";
import { DeleteSiteButton } from "./delete-site-button";
import { DiveSiteRelatedTabs } from "./dive-site-related-tabs";
import { SuggestEditLink } from "./suggest-edit-link";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 300;

const getCachedExploreSiteBySlug = cache((slug: string) =>
  getExploreSiteBySlugServer(slug),
);

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

const detailDateTimeFormatter = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: DEFAULT_TIMEZONE,
});

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return detailDateTimeFormatter.format(date);
};

const formatDepthRange = (site: ExploreSiteDetailResponse["site"]) => {
  const hasMin = typeof site.depthMinM === "number";
  const hasMax = typeof site.depthMaxM === "number";
  if (hasMin && hasMax) return `${site.depthMinM}m - ${site.depthMaxM}m`;
  if (hasMin) return `From ${site.depthMinM}m`;
  if (hasMax) return `Up to ${site.depthMaxM}m`;
  return "";
};

const formatDepthValue = (value: number | undefined) =>
  typeof value === "number" ? `${value}m` : "Not listed yet.";

const formatCoordinates = (site: ExploreSiteDetailResponse["site"]) => {
  if (typeof site.latitude !== "number" || typeof site.longitude !== "number") {
    return "";
  }
  return `${site.latitude.toFixed(5)}, ${site.longitude.toFixed(5)}`;
};

const reportCountLabel = (count: number) =>
  `${count.toLocaleString()} condition report${count === 1 ? "" : "s"}`;

const isSiteNotFoundError = (error: unknown) =>
  error instanceof FphgoFetchError && error.status === 404;

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const data = await getCachedExploreSiteBySlug(slug);
    return {
      title: `${data.site.name} | Explore Dive Sites`,
      description: `${data.site.area}. ${data.site.lastConditionSummary || data.site.typicalConditions || "Real site conditions and trust signals."}`,
      openGraph: {
        title: data.site.name,
        description: `${data.site.area}. ${data.site.lastConditionSummary || data.site.typicalConditions || "Real site conditions and trust signals."}`,
      },
    };
  } catch (error) {
    if (!isSiteNotFoundError(error)) {
      return {
        title: "Explore Dive Site",
      };
    }
    return {
      title: "Dive site not found",
    };
  }
}

export default async function ExploreSharePage({ params }: PageProps) {
  const { slug } = await params;
  let data: ExploreSiteDetailResponse;

  try {
    data = await getCachedExploreSiteBySlug(slug);
  } catch (error) {
    if (isSiteNotFoundError(error)) {
      notFound();
    }
    throw error;
  }

  const [
    related,
    presencePage,
    affinitiesPage,
    communityPostsPage,
    reviewsPage,
  ] = await Promise.all([
    getExploreSiteRelatedServer(slug),
    getExploreSitePresenceServer(slug, 6),
    getExploreSiteAffinitiesServer(slug, 6),
    getExploreSiteCommunityPostsServer(slug, undefined, 6),
    getExploreSiteReviewsServer(slug, 6),
  ]);

  const site = data.site;
  const depthRange = formatDepthRange(site);
  const coordinates = formatCoordinates(site);
  const conditionSummary = site.lastConditionSummary || site.typicalConditions;

  return (
    <div className="min-h-full bg-gradient-to-b from-muted/30 to-background px-4 py-2">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="space-y-3">
          <BackToExploreButton />
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
            Freediving Philippines
          </p>
          <h1 className="font-serif text-4xl text-foreground">{site.name}</h1>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-muted-foreground">{site.area}</p>
            <DiveSiteLikeButton
              siteId={site.id}
              likeCount={site.likeCount}
              viewerHasLiked={site.viewerHasLiked}
            />
            <SuggestEditLink slug={site.slug} />
            <DeleteSiteButton siteId={site.id} siteName={site.name} />
          </div>
        </div>

        {site.coverMedia ? (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <img
              src={site.coverMedia.displayUrl}
              alt={`${site.name} cover photo`}
              className="aspect-[16/7] w-full object-cover"
            />
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card>
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge>{titleCase(site.difficulty)}</Badge>
                <Badge variant="outline">
                  {verificationLabel(site.verificationStatus)}
                </Badge>
                {depthRange ? (
                  <Badge variant="outline">{depthRange}</Badge>
                ) : null}
              </div>
              <CardTitle>Site briefing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 text-sm text-muted-foreground">
              <p>
                {site.description || "No site description has been added yet."}
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <DetailItem
                  label="Recent conditions"
                  icon={<Waves className="size-4" />}
                >
                  {conditionSummary || "No condition reports yet."}
                </DetailItem>
                <DetailItem
                  label="Typical conditions"
                  icon={<Compass className="size-4" />}
                >
                  {site.typicalConditions || "Not listed yet."}
                </DetailItem>
                <DetailItem
                  label="Best season"
                  icon={<CalendarDays className="size-4" />}
                >
                  {site.bestSeason || "Not listed yet."}
                </DetailItem>
                <DetailItem label="Access" icon={<MapPin className="size-4" />}>
                  {site.access || "Not listed yet."}
                </DetailItem>
                <DetailItem
                  label="Fees"
                  icon={<CircleDollarSign className="size-4" />}
                >
                  {site.fees || "Not listed yet."}
                </DetailItem>
                <DetailItem label="Contact" icon={<Radio className="size-4" />}>
                  {site.contactInfo || "Not listed yet."}
                </DetailItem>
                <DetailItem
                  label="Minimum depth"
                  icon={<Gauge className="size-4" />}
                >
                  {formatDepthValue(site.depthMinM)}
                </DetailItem>
                <DetailItem
                  label="Maximum depth"
                  icon={<Gauge className="size-4" />}
                >
                  {formatDepthValue(site.depthMaxM)}
                </DetailItem>
                <DetailItem
                  label="Coordinates"
                  icon={<MapPin className="size-4" />}
                >
                  {coordinates || "No map pin listed."}
                </DetailItem>
              </div>

              <div className="space-y-2">
                <p className="flex items-center gap-2 font-medium text-foreground">
                  <TriangleAlert className="size-4" />
                  Hazards
                </p>
                {site.hazards.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {site.hazards.map((hazard) => (
                      <Badge key={hazard} variant="outline">
                        {hazard}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p>No hazards listed yet.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Directory status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <DetailItem
                label="Verification"
                icon={<ShieldCheck className="size-4" />}
              >
                {verificationLabel(site.verificationStatus)}
                {site.verifiedByDisplayName
                  ? ` by ${site.verifiedByDisplayName}`
                  : ""}
              </DetailItem>
              <DetailItem label="Reports" icon={<Flag className="size-4" />}>
                {reportCountLabel(site.reportCount)}
              </DetailItem>
              <DetailItem
                label="Last updated"
                icon={<Info className="size-4" />}
              >
                {formatDateTime(site.lastUpdatedAt)}
              </DetailItem>
              <DetailItem
                label="Listed since"
                icon={<CalendarDays className="size-4" />}
              >
                {formatDateTime(site.createdAt)}
              </DetailItem>
            </CardContent>
          </Card>
        </div>

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
                    <span>{new Date(update.occurredAt).toLocaleString()}</span>
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
          siteId={site.id}
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
}

function DetailItem({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="flex items-center gap-2 font-medium text-foreground">
        {icon}
        {label}
      </p>
      <p>{children}</p>
    </div>
  );
}
