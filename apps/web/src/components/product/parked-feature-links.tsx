"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CORE_LINKS = [
  { href: "/explore", label: "Explore dive spots" },
  { href: "/chika", label: "Read Chika" },
  { href: "/events", label: "Find events" },
  { href: "/schools", label: "Browse schools" },
];

export function ParkedFeatureLinks() {
  return (
    <div className="flex flex-wrap gap-2">
      {CORE_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}
