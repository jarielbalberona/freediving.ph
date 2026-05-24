import { ArrowRight } from "lucide-react";
import Link from "next/link";

type PublicCTAProps = {
  title?: string;
  body?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export function PublicCTA({
  title = "Join the Philippine freediving community",
  body = "Create a profile, explore dive spots, find buddies, and help make local freediving knowledge easier to discover.",
  primaryHref = "/sign-up",
  primaryLabel = "Join Freediving Philippines",
  secondaryHref = "/features",
  secondaryLabel = "See what you can do",
}: PublicCTAProps) {
  return (
    <section className="border-t border-border bg-primary/5">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="max-w-2xl space-y-2">
          <h2 className="text-xl font-semibold tracking-normal text-foreground">
            {title}
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">{body}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
          <Link
            href={primaryHref}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {primaryLabel}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link
            href={secondaryHref}
            className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-muted"
          >
            {secondaryLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
