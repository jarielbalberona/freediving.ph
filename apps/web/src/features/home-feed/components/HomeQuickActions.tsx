"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { Activity, MapPin, Plus, Users } from "lucide-react";
import type { ComponentType } from "react";

import { buttonVariants } from "@/components/ui/button";
import { useSession } from "@/features/auth/session";
import { getProfileCreateRoute } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { HomeFeedQuickAction } from "@freediving.ph/types";

const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  log_dive: Plus,
  log_training: Activity,
  find_buddy: Users,
  explore_spots: MapPin,
  create_session: Activity,
  report_conditions: Activity,
  join_event: Users,
  post_update: Plus,
  open_chika: Users,
  share_progress: Plus,
};

const hrefMap: Record<string, string> = {
  log_dive: "/training-logs",
  log_training: "/training-logs",
  find_buddy: "/buddies",
  explore_spots: "/explore",
  create_session: "/events",
  report_conditions: "/explore",
  join_event: "/events",
  post_update: "/chika/create",
  open_chika: "/chika",
  share_progress: "/chika/create",
};

export function HomeQuickActions({
  actions,
}: { actions: HomeFeedQuickAction[] }) {
  const session = useSession();
  const { user } = useUser();
  const username = session.me?.username ?? user?.username ?? null;
  const profileCreateHref = username
    ? getProfileCreateRoute(username)
    : "/sign-in";

  return (
    <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {actions.map((action) => {
        const Icon = iconMap[action.type] ?? Activity;
        const href =
          action.type === "post_update" || action.type === "share_progress"
            ? profileCreateHref
            : (hrefMap[action.type] ?? "/explore");
        return (
          <Link
            key={`${action.type}-${action.label}`}
            href={href}
            className={cn(
              buttonVariants({ variant: "secondary" }),
              "h-11 gap-2 px-3",
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="truncate text-sm font-medium">{action.label}</span>
          </Link>
        );
      })}
    </section>
  );
}
