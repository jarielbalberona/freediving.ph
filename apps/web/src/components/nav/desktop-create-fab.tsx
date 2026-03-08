"use client";

import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { ImagePlus, MessageSquarePlus, UserRoundPen } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "@/features/auth/session";
import { getProfileCreateRoute } from "@/lib/routes";

export function DesktopCreateFab() {
  const router = useRouter();
  const session = useSession();
  const { user } = useUser();
  const username = session.me?.username ?? user?.username ?? null;
  const profileCreateHref = username ? getProfileCreateRoute(username) : "/sign-in";

  return (
    <div className="fixed bottom-6 right-6 z-40 hidden md:block">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={(
            <Button
              type="button"
              size="lg"
              className="h-12 rounded-full px-4 shadow-lg"
              aria-label="Open create options"
            />
          )}
        >
          <ImagePlus className="size-5" aria-hidden />
          <span>Create</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="w-56">
          <DropdownMenuItem onClick={() => router.push("/chika/create")}>
            <MessageSquarePlus className="size-4" aria-hidden />
            Create Community Post
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push(profileCreateHref)}>
            <UserRoundPen className="size-4" aria-hidden />
            Create Profile Post
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
