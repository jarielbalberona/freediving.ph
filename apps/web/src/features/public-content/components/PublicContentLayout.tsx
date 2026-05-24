import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { StructuredData } from "@/features/public-content/components/StructuredData";
import {
  type BreadcrumbItem,
  type JsonLdObject,
  breadcrumbJsonLd,
  organizationJsonLd,
  webPageJsonLd,
  websiteJsonLd,
} from "@/features/public-content/seo/jsonLd";

const navLinks = [
  { href: "/freediving", label: "Locations" },
  { href: "/features", label: "Features" },
  { href: "/explore", label: "Explore" },
  { href: "/events", label: "Events" },
  { href: "/groups", label: "Groups" },
  { href: "/chika", label: "Chika" },
  { href: "/guides", label: "Guides" },
];

const footerLinks = [
  { href: "/freediving", label: "Locations" },
  { href: "/freediving/philippines", label: "Freediving Philippines" },
  { href: "/features", label: "Features" },
  { href: "/features/dive-spots", label: "Dive spots" },
  { href: "/features/buddy-finder", label: "Buddy finder" },
  { href: "/features/events", label: "Events" },
  { href: "/features/groups", label: "Groups" },
  { href: "/features/chika", label: "Chika" },
  { href: "/features/schools-and-courses", label: "Schools and courses" },
  { href: "/guides", label: "Guides" },
  { href: "/about-us", label: "About us" },
];

export function PublicContentLayout({
  children,
  title,
  description,
  path,
  breadcrumbs,
  jsonLd = [],
}: {
  children: ReactNode;
  title: string;
  description: string;
  path: `/${string}`;
  breadcrumbs: BreadcrumbItem[];
  jsonLd?: JsonLdObject[];
}) {
  const structuredData = [
    websiteJsonLd(),
    organizationJsonLd(),
    webPageJsonLd({ title, description, path }),
    breadcrumbJsonLd(breadcrumbs),
    ...jsonLd,
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <StructuredData data={structuredData} />
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:px-8">
          <Link href="/" className="flex items-center">
            <Image
              src="/images/fph-logo.png"
              alt="Freediving Philippines"
              width={156}
              height={36}
              priority
              className="h-auto w-[48px]"
            />
          </Link>
          <nav
            aria-label="Main navigation"
            className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground lg:ml-auto"
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            <Link href="/sign-in" className="hover:text-foreground">
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground hover:bg-primary/90"
            >
              Join
            </Link>
          </nav>
        </div>
      </header>
      {children}
      <footer className="border-t border-border bg-muted/30">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 md:grid-cols-[1.2fr_2fr] lg:px-8">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">
              Freediving Philippines
            </p>
            <p className="max-w-sm text-sm leading-6 text-muted-foreground">
              Discover dive spots, meet buddies, join events, and stay closer
              to the Philippine freediving community.
            </p>
          </div>
          <nav
            aria-label="Footer navigation"
            className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-3"
          >
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
