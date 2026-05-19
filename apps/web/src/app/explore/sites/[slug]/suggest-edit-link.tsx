"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

type SuggestEditLinkProps = {
  slug: string;
};

export function SuggestEditLink({ slug }: SuggestEditLinkProps) {
  return (
    <Link
      href={`/explore/sites/${slug}/suggest-edit`}
      className={buttonVariants({ variant: "outline", size: "sm" })}
    >
      Suggest edit
    </Link>
  );
}
