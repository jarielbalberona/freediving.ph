import Link from "next/link";

import { PublicBreadcrumbs } from "@/features/public-content/components/PublicBreadcrumbs";
import { PublicContentLayout } from "@/features/public-content/components/PublicContentLayout";
import { PublicCTA } from "@/features/public-content/components/PublicCTA";
import { PublicHero } from "@/features/public-content/components/PublicHero";
import { AdSlot } from "@/features/public-content/ads";
import type { FeaturePageContent } from "@/features/public-content/content/features";
import type { BreadcrumbItem } from "@/features/public-content/seo/jsonLd";

export function FeaturePageTemplate({
  feature,
}: { feature: FeaturePageContent }) {
  const breadcrumbs: BreadcrumbItem[] = [
    { name: "Features", path: "/features" },
    { name: feature.shortTitle, path: feature.href },
  ];

  return (
    <PublicContentLayout
      title={feature.title}
      description={feature.description}
      path={feature.href}
      breadcrumbs={breadcrumbs}
    >
      <main>
        <div className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6 lg:px-8">
          <PublicBreadcrumbs items={breadcrumbs} />
        </div>
        <PublicHero
          eyebrow={feature.eyebrow}
          title={feature.title}
          description={feature.summary}
          primary={{ href: feature.appHref, label: feature.appLabel }}
          secondary={{ href: "/features", label: "See what else you can do" }}
        />
        <AdSlot className="my-2" />
        <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
          <aside className="space-y-3">
            <p className="text-sm font-semibold text-foreground">
              Why it matters
            </p>
            <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
              {feature.highlights.map((highlight) => (
                <li
                  key={highlight}
                  className="border-l-2 border-primary/40 pl-3"
                >
                  {highlight}
                </li>
              ))}
            </ul>
          </aside>
          <div className="space-y-8">
            {feature.sections.map((section) => (
              <section key={section.title} className="space-y-2">
                <h2 className="text-xl font-semibold tracking-normal text-foreground">
                  {section.title}
                </h2>
                <p className="text-sm leading-7 text-muted-foreground">
                  {section.body}
                </p>
              </section>
            ))}
            <section className="space-y-3 border-t border-border pt-6">
              <h2 className="text-xl font-semibold tracking-normal text-foreground">
                Related links
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {feature.relatedLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-lg border border-border p-4 hover:bg-muted/50"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {link.label}
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                      {link.description}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </section>
        <PublicCTA
          primaryHref={feature.appHref}
          primaryLabel={feature.appLabel}
          secondaryHref="/guides"
          secondaryLabel="Read beginner guides"
        />
      </main>
    </PublicContentLayout>
  );
}
