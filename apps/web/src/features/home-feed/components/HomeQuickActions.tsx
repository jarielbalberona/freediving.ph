"use client";

import { Activity, MapPin, Plus, Users } from "lucide-react";
import type { ComponentType } from "react";

import { Button } from "@/components/ui/button";
import type { HomeFeedQuickAction } from "@freediving.ph/types";

const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  log_dive: Plus,
  find_buddy: Users,
  explore_spots: MapPin,
  create_session: Activity,
};

export function HomeQuickActions({ actions }: { actions: HomeFeedQuickAction[] }) {
  return (
    <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {actions.map((action) => {
        const Icon = iconMap[action.type] ?? Activity;
        return (
          <Button key={`${action.type}-${action.label}`} type="button" variant="secondary" className="h-11 gap-2 px-3">
            <Icon className="h-5 w-5" />
            <span className="truncate text-sm font-medium">{action.label}</span>
          </Button>
        );
      })}
    </section>
  );
}
