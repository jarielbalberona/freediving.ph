"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth/session";
import { cn } from "@/lib/utils";
import { getProfileCreateRoute } from "@/lib/routes";

type CreateDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const CREATE_OPTIONS = [
  { id: "profile-post", label: "Create Profile Post" },
  { id: "community-post", label: "Create Community Post" },
] as const;

export function CreateDrawer({ open, onOpenChange }: CreateDrawerProps) {
  const router = useRouter();
  const session = useSession();
  const { user } = useUser();
  const username = session.me?.username ?? user?.username ?? null;
  const profileCreateHref = username ? getProfileCreateRoute(username) : "/sign-in";

  const handleOption = (id: string) => {
    if (id === "community-post") {
      router.push("/chika/create");
    } else {
      router.push(profileCreateHref);
    }
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl pb-safe pb-4"
      >
        <SheetHeader>
          <SheetTitle>Create</SheetTitle>
        </SheetHeader>
        <ul className="px-2 flex flex-col gap-2">
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
