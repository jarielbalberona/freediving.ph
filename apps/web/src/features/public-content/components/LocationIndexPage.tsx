import Link from "next/link";

import { PublicBreadcrumbs } from "@/features/public-content/components/PublicBreadcrumbs";
import { PublicContentLayout } from "@/features/public-content/components/PublicContentLayout";
import { PublicCTA } from "@/features/public-content/components/PublicCTA";
import { PublicHero } from "@/features/public-content/components/PublicHero";
import {
  type PublicLocationContent,
  locationPages,
} from "@/features/public-content/content/locations";
import type { BreadcrumbItem } from "@/features/public-content/seo/jsonLd";

const title = "Freediving Locations in the Philippines";
const description =
  "Explore practical freediving location guides for the Philippines, with safety notes, local context, dive spot discovery, buddies, events, and schools.";

const breadcrumbs: BreadcrumbItem[] = [
  { name: "Freediving", path: "/freediving" },
];

export function LocationIndexPage() {
  const country = locationPages.find((location) => location.slug === "philippines");
  const localLocations = locationPages.filter(
    (location) => location.slug !== "philippines",
  );

  return (
    <PublicContentLayout
      title={title}
      description={description}
      path="/freediving"
      breadcrumbs={breadcrumbs}
    >
      <main>
        <div className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6 lg:px-8">
          <PublicBreadcrumbs items={breadcrumbs} />
        </div>
        <PublicHero
          eyebrow="Locations"
          title="Freediving around the Philippines"
          description="Start with real local context before choosing where to dive. Conditions vary by island, season, tide, wind, current, access, and local rules, so every plan should include guidance and a trained buddy."
          primary={{ href: "/explore", label: "Explore dive spots" }}
          secondary={{ href: "/guides/freediving-safety-basics", label: "Read safety basics" }}
        />
        <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-2">
            {country ? <LocationCard location={country} featured /> : null}
            {localLocations.map((location) => (
              <LocationCard key={location.slug} location={location} />
            ))}
          </div>
        </section>
        <section className="border-t border-border">
          <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-3 lg:px-8">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-normal text-foreground">
                Plan with people, not just pins
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Use location guides with Explore, Buddy Finder, Events, Groups,
                Chika, and schools so your next session starts with better local
                context.
              </p>
            </div>
            <Link
              href="/features/buddy-finder"
              className="rounded-lg border border-border p-4 hover:bg-muted/50"
            >
              <span className="text-sm font-medium text-foreground">
                Find a buddy
              </span>
              <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                Meet freedivers who match your pace, location, and goals.
              </span>
            </Link>
            <Link
              href="/features/schools-and-courses"
              className="rounded-lg border border-border p-4 hover:bg-muted/50"
            >
              <span className="text-sm font-medium text-foreground">
                Find schools and courses
              </span>
              <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                Start with instruction before exploring unfamiliar water.
              </span>
            </Link>
          </div>
        </section>
        <PublicCTA
          title="Start with the right local context"
          body="Browse community-shared dive spots, read beginner guides, and connect with people who know the water before planning your next freediving session."
          primaryHref="/explore"
          primaryLabel="Explore dive spots"
          secondaryHref="/guides"
          secondaryLabel="Read beginner guides"
        />
      </main>
    </PublicContentLayout>
  );
}

function LocationCard({
  location,
  featured = false,
}: {
  location: PublicLocationContent;
  featured?: boolean;
}) {
  return (
    <article
      className={
        featured
          ? "rounded-lg border border-primary/30 bg-primary/5 p-5 md:col-span-2"
          : "rounded-lg border border-border p-5"
      }
    >
      <div className="space-y-3">
        <div className="space-y-1">
          {location.regionLabel ? (
            <p className="text-xs font-medium uppercase tracking-normal text-primary">
              {location.regionLabel}
            </p>
          ) : null}
          <h2 className="text-xl font-semibold tracking-normal text-foreground">
            {location.name}
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            {location.description}
          </p>
        </div>
        <Link
          href={location.href}
          className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Read location guide
        </Link>
      </div>
    </article>
  );
}

export const locationIndexMetadata = { title, description };
