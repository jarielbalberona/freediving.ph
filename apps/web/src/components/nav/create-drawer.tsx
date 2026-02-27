"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type CreateDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const CREATE_OPTIONS = [
  { id: "profile-post", label: "Create Profile Post" },
  { id: "community-post", label: "Create Community Post" },
  { id: "story", label: "Create Story" },
] as const;

export function CreateDrawer({ open, onOpenChange }: CreateDrawerProps) {
  const handleOption = (id: string) => {
    console.info("Create option selected:", id);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-xl pb-safe"
      >
        <SheetHeader>
          <SheetTitle>Create</SheetTitle>
        </SheetHeader>
        <ul className="mt-4 flex flex-col gap-0.5">
          {CREATE_OPTIONS.map(({ id, label }) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => handleOption(id)}
                className={cn(
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                )}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
