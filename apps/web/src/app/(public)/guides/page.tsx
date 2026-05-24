import type { Metadata } from "next";
import Link from "next/link";

import { PublicBreadcrumbs } from "@/features/public-content/components/PublicBreadcrumbs";
import { PublicContentLayout } from "@/features/public-content/components/PublicContentLayout";
import { PublicCTA } from "@/features/public-content/components/PublicCTA";
import { PublicHero } from "@/features/public-content/components/PublicHero";
import { AdSlot } from "@/features/public-content/ads";
import { publishedGuides } from "@/features/public-content/content/guides";
import { buildPublicMetadata } from "@/features/public-content/seo/metadata";

const title = "Freediving Guides in the Philippines";
const description =
  "Practical guides for starting freediving in the Philippines, staying safer in the water, finding buddies, choosing courses, and planning local sessions.";

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
          title="Practical freediving guides for safer first steps"
          description="Start with the basics: training, safety, buddies, gear, certifications, seasons, and the community spaces that help you plan better dives around the Philippines."
          primary={{
            href: "/guides/how-to-start-freediving-in-the-philippines",
            label: "Start here",
          }}
          secondary={{ href: "/features", label: "See what you can do" }}
        />
        <AdSlot className="my-2" />
        <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-2">
            {publishedGuides.map((guide) => (
              <article
                key={guide.slug}
                className="rounded-lg border border-border p-5"
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {guide.readingTime ? <span>{guide.readingTime}</span> : null}
                    {guide.updatedAt ? <span>Updated {guide.updatedAt}</span> : null}
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold tracking-normal text-foreground">
                      {guide.title}
                    </h2>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {guide.description}
                    </p>
                  </div>
                  <Link
                    href={guide.href}
                    className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Read guide
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
        <PublicCTA
          title="Turn reading into a safer next step"
          body="Use Explore, Buddy Finder, Events, Groups, Chika, and Schools to connect these guides with real places and people."
          primaryHref="/features"
          primaryLabel="See what you can do"
          secondaryHref="/explore"
          secondaryLabel="Explore dive spots"
        />
      </main>
    </PublicContentLayout>
  );
}
