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
    body: "A shared public layer for discovering and contributing freediving spots.",
  },
  {
    href: "/features/buddy-finder",
    label: "Buddy Finder",
    body: "A safer way to connect with other freedivers intentionally.",
  },
  {
    href: "/features/events",
    label: "Events",
    body: "Public pages for competitions, cleanups, meetups, and activities.",
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
          description="Freediving Philippines exists because local freediving knowledge is too often scattered across posts, chat threads, and private conversations. The app gives that knowledge a more durable public home while connecting people back to real communities."
          primary={{ href: "/features", label: "View features" }}
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
                The SEO/content foundation follows the same rule. Public pages
                should point to real app surfaces and useful next steps, not
                thin articles manufactured to chase search traffic.
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
          body="Join, contribute public context, and use the app surfaces that already exist instead of waiting for a perfect directory."
          primaryHref="/sign-up"
          primaryLabel="Join Freediving Philippines"
          secondaryHref="/explore"
          secondaryLabel="Explore dive spots"
        />
      </main>
    </PublicContentLayout>
  );
}
