import Link from "next/link";

import { LocationDiveSpotSection } from "@/features/public-content/components/LocationDiveSpotSection";
import { PublicBreadcrumbs } from "@/features/public-content/components/PublicBreadcrumbs";
import { PublicContentLayout } from "@/features/public-content/components/PublicContentLayout";
import { PublicCTA } from "@/features/public-content/components/PublicCTA";
import { PublicHero } from "@/features/public-content/components/PublicHero";
import {
  featurePageBySlug,
  type FeaturePageContent,
} from "@/features/public-content/content/features";
import {
  guideBySlug,
  type GuideContent,
} from "@/features/public-content/content/guides";
import {
  locationBySlug,
  type PublicLocationContent,
} from "@/features/public-content/content/locations";
import { fetchLocationDiveSpots } from "@/features/public-content/lib/locationDiveSpots";
import type { BreadcrumbItem } from "@/features/public-content/seo/jsonLd";

export async function LocationLandingPage({
  location,
}: {
  location: PublicLocationContent;
}) {
  const breadcrumbs: BreadcrumbItem[] = [
    { name: "Freediving", path: "/freediving" },
    { name: location.name, path: location.href },
  ];
  const spots = await fetchLocationDiveSpots(location);
  const relatedGuides = location.relatedGuideSlugs
    .map((slug) => guideBySlug.get(slug))
    .filter(isDefined);
  const relatedFeatures = location.relatedFeatureSlugs
    .map((slug) => featurePageBySlug.get(slug))
    .filter(isDefined);
  const nearbyLocations = location.nearbyLocationSlugs
    .map((slug) => locationBySlug.get(slug))
    .filter(isDefined);

  return (
    <PublicContentLayout
      title={location.metaTitle}
      description={location.metaDescription}
      path={location.href}
      breadcrumbs={breadcrumbs}
    >
      <main>
        <div className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6 lg:px-8">
          <PublicBreadcrumbs items={breadcrumbs} />
        </div>
        <PublicHero
          eyebrow={location.regionLabel ?? "Philippines"}
          title={location.title}
          description={location.intro}
          primary={{ href: "/explore", label: "Explore dive spots" }}
          secondary={{
            href: "/guides/freediving-safety-basics",
            label: "Read safety basics",
          }}
        />

        <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
          <aside className="space-y-3">
            <p className="text-sm font-semibold text-foreground">
              Good for
            </p>
            <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
              {location.bestFor.map((item) => (
                <li key={item} className="border-l-2 border-primary/40 pl-3">
                  {item}
                </li>
              ))}
            </ul>
          </aside>
          <div className="space-y-8">
            <section className="space-y-3">
              <h2 className="text-xl font-semibold tracking-normal text-foreground">
                What to know
              </h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {location.highlights.map((highlight) => (
                  <div
                    key={highlight}
                    className="rounded-lg border border-border p-4"
                  >
                    <p className="text-sm leading-6 text-muted-foreground">
                      {highlight}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <h2 className="text-xl font-semibold tracking-normal text-foreground">
                  Safety notes
                </h2>
                <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
                  {location.safetyNotes.map((note) => (
                    <li key={note} className="flex gap-2">
                      <span aria-hidden="true" className="text-primary">
                        -
                      </span>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-3">
                <h2 className="text-xl font-semibold tracking-normal text-foreground">
                  Getting started
                </h2>
                <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
                  {location.gettingStartedTips.map((tip) => (
                    <li key={tip} className="flex gap-2">
                      <span aria-hidden="true" className="text-primary">
                        -
                      </span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </div>
        </section>

        <LocationDiveSpotSection location={location} spots={spots} />

        <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-3 lg:px-8">
          <RelatedLinkGroup title="Helpful guides" links={relatedGuides} />
          <RelatedLinkGroup title="Plan with the community" links={relatedFeatures} />
          <RelatedLinkGroup title="Nearby location guides" links={nearbyLocations} />
        </section>

        <PublicCTA
          title={`Plan a safer ${location.name} freediving session`}
          body="Use the guides, Explore, Buddy Finder, Events, Groups, Chika, and schools to connect local context with real people before entering the water."
          primaryHref="/explore"
          primaryLabel="Explore dive spots"
          secondaryHref="/features/buddy-finder"
          secondaryLabel="Find a buddy"
        />
      </main>
    </PublicContentLayout>
  );
}

function RelatedLinkGroup({
  title,
  links,
}: {
  title: string;
  links: Array<
    | GuideContent
    | FeaturePageContent
    | PublicLocationContent
    | { title?: string; name?: string; href: string; description?: string }
  >;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold tracking-normal text-foreground">
        {title}
      </h2>
      <div className="grid gap-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-lg border border-border p-4 hover:bg-muted/50"
          >
            <span className="text-sm font-medium text-foreground">
              {linkLabel(link)}
            </span>
            {link.description ? (
              <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                {link.description}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  );
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

function linkLabel({
  title,
  ...link
}: {
  title?: string;
  name?: string;
}): string {
  return title ?? link.name ?? "Read more";
}
