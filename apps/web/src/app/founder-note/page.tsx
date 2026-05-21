import type { Metadata } from "next";
import Image from "next/image";
import { ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: {
    absolute: "Founder's Note | Freediving Philippines",
  },
  description:
    "Learn about Freediving Philippines, a community app for freedivers to discover dive spots, connect with buddies, join events, and grow the freediving community in the Philippines.",
  alternates: {
    canonical: "/founder-note",
  },
};

const APP_LOGO_URL = "https://cdn.freediving.ph/freediving.ph.png";
const FOUNDER_PHOTO_URL = "https://cdn.freediving.ph/freedivingph-founder.webp";
const GCASH_QR_URL = "https://cdn.freediving.ph/FPH-GCash.jpg";

const features = [
  "Contribute dive spots",
  "Tag dive spots in posts",
  "Find and save dive spots",
  "Connect with freediving buddies",
  "Join groups",
  "Join events",
  "Be part of the Philippine freediving community",
  {
    label: "Suggest features and help prioritize what should improve next",
    href: "https://freediving.ph/chika/dfe4ab16-5b88-4812-a58f-21e15d246d5e",
  },
];

const appLinks = [
  {
    label: "Freediving Philippines Facebook",
    href: "https://www.facebook.com/freediving.ph",
  },
  {
    label: "Freediving Philippines Instagram",
    href: "https://www.instagram.com/freediving.ph",
  },
];

const founderLinks = [
  {
    label: "Founder Instagram",
    href: "https://www.instagram.com/jarielbalberona/",
  },
  {
    label: "Founder Facebook",
    href: "https://www.facebook.com/jarielbalberona",
  },
  {
    label: "Know me more as a software engineer",
    href: "https://jarielbalberona.dev/",
  },
];

export default function FounderNotePage() {
  return (
    <main className="min-h-full bg-background px-4 py-5 text-foreground sm:py-6">
      <article className="mx-auto w-full max-w-3xl space-y-8">
        <header className="space-y-4">
          <Image
            src={APP_LOGO_URL}
            alt="Freediving Philippines logo"
            width={180}
            height={42}
            priority
            className="h-auto w-36"
          />
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
              Founder's Note
            </p>
            <h1 className="text-2xl font-medium tracking-tight text-foreground">
              Built for the Philippine freediving community
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Freediving.ph is a community app for freedivers in the
              Philippines. It helps people discover and contribute dive spots,
              tag places in posts, find buddies, join groups and events, and
              keep the local freediving community easier to find in one place.
            </p>
          </div>
        </header>

        <section className="grid gap-5 border-t border-border pt-6 sm:grid-cols-[256px_1fr]">
          <Image
            src={FOUNDER_PHOTO_URL}
            alt="Founder of Freediving Philippines"
            width={640}
            height={800}
            sizes="(min-width: 640px) 256px, 176px"
            className="h-[220px] w-44 rounded-md object-cover sm:h-80 sm:w-full"
          />
          <div className="space-y-3 text-sm leading-6 text-muted-foreground">
            <p>
              Freediving.ph started as an idea around three years ago. I already
              saw the gap: dive spots, trip plans, buddy-finding, groups, and
              community posts were scattered everywhere. The potential was
              obvious, but I did not have enough time then because other
              priorities kept taking over.
            </p>
            <p>
              The app is live now, and it will keep improving. It is not a
              faceless project dropped on the internet and forgotten. Because
              the app is built and maintained directly by a software engineer,
              issues can be addressed directly and the platform can keep
              improving over time.
            </p>
            <p>
              The goal is not to replace real local communities. The goal is to
              make them easier to discover, support, and connect.
            </p>
          </div>
        </section>

        <section className="border-t border-border pt-6">
          <h2 className="text-base font-medium text-foreground">
            What Freediving.ph helps with
          </h2>
          <ul className="mt-3 divide-y divide-border text-sm text-muted-foreground">
            {features.map((feature) => (
              <li
                key={typeof feature === "string" ? feature : feature.label}
                className="py-2"
              >
                {typeof feature === "string" ? (
                  feature
                ) : (
                  <a
                    href={feature.href}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {feature.label}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="border-t border-border pt-6">
          <h2 className="text-base font-medium text-foreground">
            Support Freediving.ph
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Support helps pay for servers, tools, storage, and ongoing
            maintenance to keep the app running. If Freediving.ph helps you find
            places, buddies, groups, or events, this keeps the platform moving
            without turning it into a corporate product.
          </p>
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-primary underline-offset-4 hover:underline">
              Show support QR
            </summary>
            <div className="mt-3 max-w-xs">
              <Image
                src={GCASH_QR_URL}
                alt="GCash QR code for supporting Freediving Philippines"
                width={720}
                height={720}
                className="h-auto w-full border border-border"
              />
            </div>
          </details>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Thank you for helping keep Freediving.ph running.
          </p>
        </section>

        <section className="grid gap-6 border-t border-border pt-6 sm:grid-cols-2">
          <LinkGroup title="Freediving Philippines" links={appLinks} />
          <LinkGroup title="Founder" links={founderLinks} />
        </section>
      </article>
    </main>
  );
}

function LinkGroup({
  title,
  links,
}: {
  title: string;
  links: Array<{ label: string; href: string }>;
}) {
  return (
    <div>
      <h2 className="text-base font-medium text-foreground">{title}</h2>
      <ul className="mt-2 space-y-2 text-sm">
        {links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-primary underline-offset-4 hover:underline"
            >
              {link.label}
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
