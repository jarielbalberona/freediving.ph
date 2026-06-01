"use client";

import type { BadgeCategorySummary } from "@freediving.ph/types";
import Image from "next/image";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ProfileBadgeIdentityRowProps = {
  items: BadgeCategorySummary[];
  className?: string;
};

export function ProfileBadgeIdentityRow({
  items,
  className,
}: ProfileBadgeIdentityRowProps) {
  const [selectedIdentity, setSelectedIdentity] =
    useState<BadgeCategorySummary | null>(null);

  if (items.length === 0) {
    return null;
  }

  return (
    <>
      <div
        className={cn("flex flex-wrap gap-2 pt-1", className)}
        aria-label="Badge category identities"
      >
        {items.map((item) => (
          <button
            key={item.category}
            type="button"
            className="flex items-center relative cursor-zoom-in"
            aria-label={`${item.identityName}, ${item.count} badges`}
            title={`Open ${item.identityName}`}
            onClick={() => setSelectedIdentity(item)}
          >
            <Image
              src={item.imageUrl}
              alt={`${item.identityName} badge identity`}
              width={50}
              height={50}
              className="size-12 shrink-0 object-contain"
              sizes="50px"
            />
            <Badge
              variant="secondary"
              className="h-5 top-[-5] left-[-5] min-w-5 justify-center px-1.5 bg-primary absolute text-white font-bold"
            >
              {item.count}
            </Badge>
            <span className="sr-only">
              {item.identityName}, {item.count} badges
            </span>
          </button>
        ))}
      </div>

      <Dialog
        open={Boolean(selectedIdentity)}
        onOpenChange={(open) => {
          if (!open) setSelectedIdentity(null);
        }}
      >
        <DialogContent className="sm:max-w-3xl!">
          <DialogHeader>
            <DialogTitle className="sr-only">
              {selectedIdentity?.identityName ?? "Badge identity"} image
            </DialogTitle>
          </DialogHeader>
          {selectedIdentity ? (
            <div className="flex items-center justify-center">
              <Image
                src={selectedIdentity.imageUrl}
                alt={`${selectedIdentity.identityName} badge identity full view`}
                width={960}
                height={960}
                sizes="(max-width: 768px) 90vw, 60vw"
                className="h-auto max-h-[80vh] w-auto max-w-full object-contain"
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
