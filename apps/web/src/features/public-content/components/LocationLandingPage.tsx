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

const philippinesDestinationLinks = [
  { href: "/freediving/siquijor", label: "Siquijor" },
  { href: "/freediving/batangas", label: "Batangas" },
  { href: "/freediving/cebu", label: "Cebu" },
  { href: "/freediving/dauin", label: "Dauin" },
  { href: "/freediving/apo-island", label: "Apo Island" },
  { href: "/freediving/panglao", label: "Panglao" },
  { href: "/freediving/moalboal", label: "Moalboal" },
] as const;

const philippinesAppLinks = [
  { href: "/explore", label: "Explore community dive spots" },
  { href: "/schools", label: "Browse schools and courses" },
  { href: "/events", label: "See upcoming events" },
  { href: "/groups", label: "Join local groups" },
  { href: "/chika", label: "Ask questions in Chika" },
  { href: "/buddies", label: "Find a buddy" },
] as const;

const philippinesGuideLinks = [
  {
    href: "/guides/how-to-start-freediving-in-the-philippines",
    label: "How to start freediving in the Philippines",
  },
  { href: "/guides/freediving-safety-basics", label: "Freediving safety basics" },
  {
    href: "/guides/what-to-bring-to-a-freediving-session",
    label: "What to bring to a session",
  },
  {
    href: "/guides/how-to-find-a-freediving-buddy",
    label: "How to find a freediving buddy",
  },
  {
    href: "/guides/freediving-certifications-philippines",
    label: "Freediving certifications in the Philippines",
  },
  {
    href: "/guides/best-time-to-freedive-in-the-philippines",
    label: "Best time to freedive in the Philippines",
  },
] as const;

const philippinesFeatureLinks = [
  { href: "/features/dive-spots", label: "Explore dive spots in the app" },
  {
    href: "/features/schools-and-courses",
    label: "Browse schools and courses",
  },
  { href: "/features/buddy-finder", label: "Use Buddy Finder" },
  { href: "/features/events", label: "Discover community events" },
  { href: "/features/groups", label: "Find local groups" },
  { href: "/features/chika", label: "Follow community discussions" },
] as const;

function isPhilippinesLanding(location: PublicLocationContent) {
  return location.slug === "philippines";
}

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

        {isPhilippinesLanding(location) ? (
          <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8">
            <article className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
              <h2 className="text-xl font-semibold tracking-normal text-foreground">
                Why the Philippines is a strong freediving destination
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                The Philippines is a practical national hub for people in different
                stages: beginners, travelers, regular practitioners, and people
                checking schools for their next step. The right destination often
                comes down to conditions, buddy setup, training access, and local
                support.
              </p>
              <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
                <li>- island variety for multiple water profiles</li>
                <li>- local schools and communities you can coordinate with</li>
                <li>- access to both training-focused and travel-focused dives</li>
              </ul>
            </article>

            <article className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
              <h2 className="text-xl font-semibold tracking-normal text-foreground">
                Best places to start exploring
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Use the destination guides below as first-pass options. Confirm
                local access and conditions before planning a session.
              </p>
              <div className="grid gap-2">
                {philippinesDestinationLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm text-primary underline-offset-4 hover:underline"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </article>

            <article className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
              <h2 className="text-xl font-semibold tracking-normal text-foreground">
                How to choose a destination
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Pick by intent, not by hype: beginner-friendly learning, weekend
                trips from Manila, schools and courses, community dives, marine
                life focus, or quieter island time.
              </p>
              <p className="text-sm leading-6 text-muted-foreground">
                Start broad, then narrow by weather window, buddy team, training
                plan, and local rules before committing.
              </p>
            </article>

            <article className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
              <h2 className="text-xl font-semibold tracking-normal text-foreground">
                Schools, guides, and next actions
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                For most beginners, the most realistic next step is to join a
                guided session first, then choose your next island based on
                comfort and local support.
              </p>
              <div className="grid gap-2">
                <Link
                  href="/schools"
                  className="text-sm text-primary underline-offset-4 hover:underline"
                >
                  Compare schools
                </Link>
                <Link
                  href="/features/schools-and-courses"
                  className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Schools and courses
                </Link>
                <Link
                  href="/guides/freediving-certifications-philippines"
                  className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Freediving certifications in the Philippines
                </Link>
              </div>
            </article>

            <article className="space-y-4 rounded-lg border border-border bg-muted/30 p-4 lg:col-span-2">
              <h2 className="text-xl font-semibold tracking-normal text-foreground">
                Safety and planning
              </h2>
              <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
                <li>
                  - Never freedive alone. Build a trained buddy setup for every
                  session.
                </li>
                <li>
                  - Confirm tide, swell, current, boat traffic, and entry
                  conditions before entering.
                </li>
                <li>
                  - Respect marine protected areas and local rules, and follow
                  community guidance when in doubt.
                </li>
              </ul>
              <div className="grid gap-2 sm:grid-cols-2">
                {philippinesGuideLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </article>

            <article className="space-y-4 rounded-lg border border-border bg-muted/30 p-4 lg:col-span-2">
              <h2 className="text-xl font-semibold tracking-normal text-foreground">
                Community next steps
              </h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {philippinesFeatureLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              <div className="grid gap-2 pt-2 sm:grid-cols-2">
                {philippinesAppLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </article>
          </section>
        ) : null}

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
