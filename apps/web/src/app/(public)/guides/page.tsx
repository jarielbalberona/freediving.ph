import type { Metadata } from "next";
import Link from "next/link";

import { PublicBreadcrumbs } from "@/features/public-content/components/PublicBreadcrumbs";
import { PublicContentLayout } from "@/features/public-content/components/PublicContentLayout";
import { PublicCTA } from "@/features/public-content/components/PublicCTA";
import { PublicHero } from "@/features/public-content/components/PublicHero";
import { AdSlot } from "@/features/public-content/ads";
import { guides } from "@/features/public-content/content/guides";
import { buildPublicMetadata } from "@/features/public-content/seo/metadata";

const title = "Freediving Guides in the Philippines";
const description =
  "Practical Freediving Philippines guides for getting started, safety, buddies, gear, certifications, and local community discovery.";

export const metadata: Metadata = buildPublicMetadata({
  title,
  description,
  path: "/guides",
});

const breadcrumbs = [{ name: "Guides", path: "/guides" as const }];

export default function GuidesPage() {
  return (
    <PublicContentLayout
      title={title}
      description={description}
      path="/guides"
      breadcrumbs={breadcrumbs}
    >
      <main>
        <div className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6 lg:px-8">
          <PublicBreadcrumbs items={breadcrumbs} />
        </div>
        <PublicHero
          eyebrow="Guides"
          title="Practical freediving guides without filler"
          description="This guide section is structured for useful long-form content. Phase 1 publishes only one starter guide and keeps planned topics visible without creating thin SEO pages."
          primary={{
            href: "/guides/how-to-start-freediving-in-the-philippines",
            label: "Read the starter guide",
          }}
          secondary={{ href: "/features", label: "View features" }}
        />
        <AdSlot className="my-2" />
        <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-2">
            {guides.map((guide) => {
              const isPublished = guide.status === "published";
              return (
                <article
                  key={guide.slug}
                  className="rounded-lg border border-border p-5"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                        {isPublished ? "Published" : "Coming soon"}
                      </span>
                      {guide.readingTime ? (
                        <span className="text-xs text-muted-foreground">
                          {guide.readingTime}
                        </span>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-xl font-semibold tracking-normal text-foreground">
                        {guide.title}
                      </h2>
                      <p className="text-sm leading-6 text-muted-foreground">
                        {guide.description}
                      </p>
                    </div>
                    {isPublished ? (
                      <Link
                        href={guide.href}
                        className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
                      >
                        Read guide
                      </Link>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Planned topic. Not indexed as a separate page yet.
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
        <PublicCTA
          title="Use the app while guides expand"
          body="The useful path today is the app itself: Explore, Buddy Finder, Events, Groups, Chika, and Schools."
          primaryHref="/features"
          primaryLabel="View platform features"
          secondaryHref="/explore"
          secondaryLabel="Explore dive spots"
        />
      </main>
    </PublicContentLayout>
  );
}
