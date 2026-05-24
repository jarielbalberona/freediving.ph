import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type CoreLink = {
  href: string;
  label: string;
};

const CORE_LINKS: CoreLink[] = [
  { href: "/explore", label: "Explore dive spots" },
  { href: "/chika", label: "Read Chika" },
  { href: "/events", label: "Find events" },
  { href: "/schools", label: "Browse schools" },
];

export function ParkedFeaturePage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <Card className="shadow-none">
        <CardContent className="space-y-5 p-6">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Parked for launch
            </p>
            <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
            <p className="text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            This area is intentionally closed while Freediving Philippines
            focuses on the community features that are open and useful today.
          </p>
          <div className="flex flex-wrap gap-2">
            {CORE_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
