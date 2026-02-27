"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
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
              <Button
                type="button"
                variant="ghost"
                className={cn(
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full justify-start rounded-lg px-3 py-2.5 text-sm"
                )}
                onClick={() => handleOption(id)}
              >
                {label}
              </Button>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
