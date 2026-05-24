import type { Metadata } from "next";
import Link from "next/link";

import { PublicBreadcrumbs } from "@/features/public-content/components/PublicBreadcrumbs";
import { PublicContentLayout } from "@/features/public-content/components/PublicContentLayout";
import { PublicCTA } from "@/features/public-content/components/PublicCTA";
import { PublicHero } from "@/features/public-content/components/PublicHero";
import { AdSlot } from "@/features/public-content/ads";
import { featurePages } from "@/features/public-content/content/features";
import { buildPublicMetadata } from "@/features/public-content/seo/metadata";

const title = "Freediving Philippines | Dive Spots, Buddies, Events and Guides";
const description =
  "Discover dive spots, meet freediving buddies, join events and groups, ask questions, and find schools or courses around the Philippines.";

export const metadata: Metadata = buildPublicMetadata({
  title,
  description,
  path: "/features",
});

const breadcrumbs = [{ name: "Features", path: "/features" as const }];

export default function FeaturesPage() {
  return (
    <PublicContentLayout
      title={title}
      description={description}
      path="/features"
      breadcrumbs={breadcrumbs}
    >
      <main>
        <div className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6 lg:px-8">
          <PublicBreadcrumbs items={breadcrumbs} />
        </div>
        <PublicHero
          eyebrow="What you can do"
          title="Find your next dive, buddy, event, group, or course"
          description="Freediving Philippines brings together the practical things freedivers need around the country: places to explore, people to meet, activities to join, questions to ask, and schools to learn from."
          primary={{ href: "/sign-up", label: "Join the community" }}
          secondary={{ href: "/guides", label: "Read guides" }}
        />
        <AdSlot className="my-2" />
        <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-2">
            {featurePages.map((feature) => (
              <article
                key={feature.slug}
                className="rounded-lg border border-border p-5"
              >
                <div className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-normal text-primary">
                    {feature.eyebrow}
                  </p>
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold tracking-normal text-foreground">
                      {feature.shortTitle}
                    </h2>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <Link
                      href={feature.href}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      See details
                    </Link>
                    <Link
                      href={feature.appHref}
                      className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      {feature.appLabel}
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="border-t border-border">
          <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-3 lg:px-8">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-normal text-foreground">
                Start with real community activity
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Browse what is already useful today: dive spots, community
                discussions, events, groups, buddies, and schools around the
                Philippines.
              </p>
            </div>
            <Link
              href="/explore"
              className="rounded-lg border border-border p-4 hover:bg-muted/50"
            >
              <span className="text-sm font-medium text-foreground">
                Explore dive spots
              </span>
              <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                Browse dive spots, local notes, and community context.
              </span>
            </Link>
            <Link
              href="/chika"
              className="rounded-lg border border-border p-4 hover:bg-muted/50"
            >
              <span className="text-sm font-medium text-foreground">
                Read Chika
              </span>
              <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                Follow community questions, stories, recommendations, and
                local updates.
              </span>
            </Link>
          </div>
        </section>
        <PublicCTA />
      </main>
    </PublicContentLayout>
  );
}
