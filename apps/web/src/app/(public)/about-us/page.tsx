import type { Metadata } from "next";
import Link from "next/link";

import { PublicBreadcrumbs } from "@/features/public-content/components/PublicBreadcrumbs";
import { PublicContentLayout } from "@/features/public-content/components/PublicContentLayout";
import { PublicCTA } from "@/features/public-content/components/PublicCTA";
import { PublicHero } from "@/features/public-content/components/PublicHero";
import { aboutContent } from "@/features/public-content/content/about";
import { buildPublicMetadata } from "@/features/public-content/seo/metadata";

export const metadata: Metadata = buildPublicMetadata({
  title: aboutContent.title,
  description: aboutContent.description,
  path: aboutContent.href,
});

const breadcrumbs = [{ name: "About us", path: "/about-us" as const }];

export default function AboutUsPage() {
  return (
    <PublicContentLayout
      title={aboutContent.title}
      description={aboutContent.description}
      path={aboutContent.href}
      breadcrumbs={breadcrumbs}
    >
      <main>
        <div className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6 lg:px-8">
          <PublicBreadcrumbs items={breadcrumbs} />
        </div>
        <PublicHero
          eyebrow="About us"
          title={aboutContent.heroTitle}
          description={aboutContent.heroDescription}
          primary={{ href: "/features", label: "See what you can do" }}
          secondary={{ href: "/founder-note", label: "Read founder note" }}
        />
        <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_1fr] lg:px-8">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold tracking-normal text-foreground">
              Why this exists
            </h2>
            <div className="space-y-3 text-sm leading-7 text-muted-foreground">
              {aboutContent.sections[0]?.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
          <div className="grid gap-3">
            {aboutContent.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg border border-border p-4 hover:bg-muted/50"
              >
                <span className="text-sm font-medium text-foreground">
                  {link.label}
                </span>
                <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                  {link.body}
                </span>
              </Link>
            ))}
          </div>
        </section>
        <PublicCTA
          title="Help make freediving easier to discover"
          body="Join the community, share useful local context, and help other freedivers find places, people, and learning opportunities around the Philippines."
          primaryHref="/sign-up"
          primaryLabel="Join Freediving Philippines"
          secondaryHref="/explore"
          secondaryLabel="Explore dive spots"
        />
      </main>
    </PublicContentLayout>
  );
}
