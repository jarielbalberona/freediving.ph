import { ArrowRight } from "lucide-react";
import Link from "next/link";

type HeroLink = {
  href: string;
  label: string;
};

export function PublicHero({
  eyebrow,
  title,
  description,
  primary,
  secondary,
}: {
  eyebrow: string;
  title: string;
  description: string;
  primary?: HeroLink;
  secondary?: HeroLink;
}) {
  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:px-6 sm:py-14 lg:grid-cols-[1fr_360px] lg:px-8">
        <div className="max-w-3xl space-y-5">
          <p className="text-sm font-medium uppercase tracking-normal text-primary">
            {eyebrow}
          </p>
          <div className="space-y-4">
            <h1 className="text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
              {title}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground">
              {description}
            </p>
          </div>
          {primary || secondary ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              {primary ? (
                <Link
                  href={primary.href}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  {primary.label}
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              ) : null}
              {secondary ? (
                <Link
                  href={secondary.href}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-medium text-foreground hover:bg-muted"
                >
                  {secondary.label}
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="grid gap-3 rounded-lg border border-border bg-muted/35 p-4 text-sm leading-6 text-muted-foreground">
          <p className="font-medium text-foreground">Popular places to start</p>
          <div className="grid gap-2">
            <Link href="/explore" className="hover:text-foreground">
              Explore dive spots
            </Link>
            <Link href="/events" className="hover:text-foreground">
              Freediving events
            </Link>
            <Link href="/groups" className="hover:text-foreground">
              Groups and communities
            </Link>
            <Link href="/chika" className="hover:text-foreground">
              Chika discussions
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
