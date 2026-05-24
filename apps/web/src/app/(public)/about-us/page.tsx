import type { Metadata } from "next";
import Link from "next/link";

import { PublicBreadcrumbs } from "@/features/public-content/components/PublicBreadcrumbs";
import { PublicContentLayout } from "@/features/public-content/components/PublicContentLayout";
import { PublicCTA } from "@/features/public-content/components/PublicCTA";
import { PublicHero } from "@/features/public-content/components/PublicHero";
import { buildPublicMetadata } from "@/features/public-content/seo/metadata";

const title = "About Freediving Philippines";
const description =
  "Freediving Philippines is a community app for discovering dive spots, finding buddies, joining events, and supporting local freediving communities in the Philippines.";

export const metadata: Metadata = buildPublicMetadata({
  title,
  description,
  path: "/about-us",
});

const breadcrumbs = [{ name: "About us", path: "/about-us" as const }];

const appLinks = [
  {
    href: "/features/dive-spots",
    label: "Dive spots",
    body: "Discover community-shared places to freedive and contribute useful local details.",
  },
  {
    href: "/features/buddy-finder",
    label: "Buddy Finder",
    body: "A safer way to connect with other freedivers intentionally.",
  },
  {
    href: "/features/events",
    label: "Events",
    body: "Find competitions, cleanups, meetups, school activities, and community dives.",
  },
  {
    href: "/features/groups",
    label: "Groups",
    body: "Discover local communities, clubs, and shared-interest groups.",
  },
];

export default function AboutUsPage() {
  return (
    <PublicContentLayout
      title={title}
      description={description}
      path="/about-us"
      breadcrumbs={breadcrumbs}
    >
      <main>
        <div className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6 lg:px-8">
          <PublicBreadcrumbs items={breadcrumbs} />
        </div>
        <PublicHero
          eyebrow="About us"
          title="Built for the Philippine freediving community"
          description="Freediving Philippines exists because local freediving knowledge is often scattered across posts, chat threads, and private conversations. We help people find places, buddies, events, groups, schools, and stories from the community."
          primary={{ href: "/features", label: "See what you can do" }}
          secondary={{ href: "/founder-note", label: "Read founder note" }}
        />
        <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_1fr] lg:px-8">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold tracking-normal text-foreground">
              The practical goal
            </h2>
            <div className="space-y-3 text-sm leading-7 text-muted-foreground">
              <p>
                The goal is not to replace instructors, clubs, organizers, or
                local groups. The useful role is simpler: make the community
                easier to find, navigate, and contribute to.
              </p>
              <p>
                That means public dive spot discovery, buddy finding, events,
                groups, Chika discussions, schools, instructors, courses, and
                media that can connect back to real places.
              </p>
              <p>
                Public guides should help real people take useful next steps:
                learn the basics, find safer buddies, choose instruction, and
                discover places with better local context.
              </p>
            </div>
          </div>
          <div className="grid gap-3">
            {appLinks.map((link) => (
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
