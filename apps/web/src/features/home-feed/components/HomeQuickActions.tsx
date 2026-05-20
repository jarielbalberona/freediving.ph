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
  find_buddy: "/buddies",
  explore_spots: "/explore",
  create_session: "/events",
  report_conditions: "/explore",
  join_event: "/events",
  post_update: "/chika/create",
  open_chika: "/chika",
  share_progress: "/chika/create",
};

const hiddenActionTypes = new Set(["log_dive", "log_training"]);

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
    <section className="grid grid-flow-col auto-cols-fr gap-1 sm:gap-2">
      {actions
        .filter((action) => !hiddenActionTypes.has(action.type))
        .map((action) => {
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
                buttonVariants({ variant: "secondary", size: "xs" }),
                "h-8 min-w-0 gap-1 px-1.5 text-[10px] leading-none sm:px-2 sm:text-xs",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="min-w-0 truncate font-medium">{action.label}</span>
            </Link>
          );
        })}
    </section>
  );
}
