import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { PublicBreadcrumbs } from "@/features/public-content/components/PublicBreadcrumbs";
import { PublicContentLayout } from "@/features/public-content/components/PublicContentLayout";
import { PublicCTA } from "@/features/public-content/components/PublicCTA";
import { AdSlot } from "@/features/public-content/ads";
import {
  type GuideContent,
  guideBySlug,
  publishedGuides,
} from "@/features/public-content/content/guides";
import {
  articleJsonLd,
  type BreadcrumbItem,
} from "@/features/public-content/seo/jsonLd";
import { buildPublicMetadata } from "@/features/public-content/seo/metadata";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return publishedGuides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = guideBySlug.get(slug);
  if (!guide || guide.status !== "published") {
    return {};
  }

  return buildPublicMetadata({
    title: guide.title,
    description: guide.description,
    path: guide.href,
    type: "article",
  });
}

export default async function GuideDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const guide = guideBySlug.get(slug);

  if (!guide || guide.status !== "published" || !guide.sections) {
    notFound();
  }

  const breadcrumbs: BreadcrumbItem[] = [
    { name: "Guides", path: "/guides" },
    { name: guide.title, path: guide.href },
  ];

  return <GuideArticle guide={guide} breadcrumbs={breadcrumbs} />;
}

function GuideArticle({
  guide,
  breadcrumbs,
}: {
  guide: GuideContent;
  breadcrumbs: BreadcrumbItem[];
}) {
  return (
    <PublicContentLayout
      title={guide.title}
      description={guide.description}
      path={guide.href}
      breadcrumbs={breadcrumbs}
      jsonLd={[
        articleJsonLd({
          title: guide.title,
          description: guide.description,
          path: guide.href,
          publishedAt: guide.publishedAt ?? "2026-05-24",
          updatedAt: guide.updatedAt,
        }),
      ]}
    >
      <main>
        <article className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <PublicBreadcrumbs items={breadcrumbs} />
          <header className="mt-8 space-y-4 border-b border-border pb-8">
            <p className="text-sm font-medium uppercase tracking-normal text-primary">
              Guide
            </p>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
                {guide.title}
              </h1>
              <p className="text-base leading-7 text-muted-foreground">
                {guide.description}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              {guide.publishedAt ? (
                <span>Published {guide.publishedAt}</span>
              ) : null}
              {guide.readingTime ? <span>{guide.readingTime}</span> : null}
            </div>
          </header>

          <AdSlot className="my-6" />

          <div className="space-y-8 py-8">
            {guide.sections?.map((section) => (
              <section key={section.title} className="space-y-3">
                <h2 className="text-xl font-semibold tracking-normal text-foreground">
                  {section.title}
                </h2>
                <div className="space-y-3 text-sm leading-7 text-muted-foreground">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {(guide.sections?.length ?? 0) >= 4 ? (
            <AdSlot className="my-6" reservedHeight={250} />
          ) : null}

          {guide.relatedLinks?.length ? (
            <section className="border-t border-border pt-6">
              <h2 className="text-xl font-semibold tracking-normal text-foreground">
                Next places to open
              </h2>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {guide.relatedLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-lg border border-border px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </article>
        <PublicCTA
          title="Start with the real community surfaces"
          body="Use Explore, Buddy Finder, Schools, Events, Groups, and Chika to turn this guide into actual next steps."
          primaryHref="/features"
          primaryLabel="View features"
          secondaryHref="/sign-up"
          secondaryLabel="Join"
        />
      </main>
    </PublicContentLayout>
  );
}
