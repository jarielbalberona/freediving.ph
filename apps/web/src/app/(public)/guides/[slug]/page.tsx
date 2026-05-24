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

function sectionId(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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

          {guide.sections?.length ? (
            <nav
              aria-label="Guide sections"
              className="mt-6 rounded-lg border border-border bg-muted/20 p-4"
            >
              <h2 className="text-sm font-semibold text-foreground">
                In this guide
              </h2>
              <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
                {guide.sections.map((section) => (
                  <li key={section.title}>
                    <Link
                      href={`#${sectionId(section.title)}`}
                      className="underline-offset-4 hover:text-primary hover:underline"
                    >
                      {section.title}
                    </Link>
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}

          <AdSlot className="my-6" />

          <div className="space-y-8 py-8">
            {guide.sections?.map((section) => (
              <section
                key={section.title}
                id={sectionId(section.title)}
                className="scroll-mt-24 space-y-3"
              >
                <h2 className="text-xl font-semibold tracking-normal text-foreground">
                  {section.title}
                </h2>
                <div className="space-y-3 text-sm leading-7 text-muted-foreground">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  {section.bullets?.length ? (
                    <ul className="space-y-2 pl-5">
                      {section.bullets.map((item) => (
                        <li key={item} className="list-disc">
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {section.checklist?.length ? (
                    <ul className="space-y-2 rounded-lg border border-border bg-muted/20 p-4">
                      {section.checklist.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span aria-hidden="true" className="text-primary">
                            -
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {section.links?.length ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {section.links.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className="rounded-md border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/50"
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
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
                Keep reading and planning
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
          title="Find your next step in the community"
          body="Use Explore, Buddy Finder, Schools, Events, Groups, and Chika to connect this guide with real places and people."
          primaryHref="/features"
          primaryLabel="See what you can do"
          secondaryHref="/sign-up"
          secondaryLabel="Join"
        />
      </main>
    </PublicContentLayout>
  );
}
