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
import { ImagePlus, MessageSquarePlus } from "lucide-react";

type CreateDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const CREATE_OPTIONS = [
  {
    id: "community-post",
    label: "Post in Chika",
    description: "Ask a question or start a community conversation.",
    icon: MessageSquarePlus,
  },
  {
    id: "profile-post",
    label: "Share photos",
    description: "Add dive photos to your profile.",
    icon: ImagePlus,
  },
] as const;

export function CreateDrawer({ open, onOpenChange }: CreateDrawerProps) {
  const router = useRouter();
  const session = useSession();
  const { user } = useUser();
  const username = session.me?.username ?? user?.username ?? null;
  const profileCreateHref = username
    ? getProfileCreateRoute(username)
    : "/sign-in";

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
      <SheetContent side="bottom" className="rounded-t-2xl pb-safe pb-4">
        <SheetHeader>
          <SheetTitle>What do you want to share?</SheetTitle>
        </SheetHeader>
        <ul className="px-2 flex flex-col gap-2">
          {CREATE_OPTIONS.map(({ id, label, description, icon: Icon }) => (
            <li key={id}>
              <Button
                type="button"
                variant="ghost"
                className={cn(
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground h-auto w-full justify-start rounded-lg px-3 py-3 text-left",
                )}
                onClick={() => handleOption(id)}
              >
                <Icon className="mr-3 size-5 shrink-0" aria-hidden />
                <span className="flex flex-col">
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {description}
                  </span>
                </span>
              </Button>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
