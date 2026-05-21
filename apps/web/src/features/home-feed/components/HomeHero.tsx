"use client";

import type { HomeFeedMode } from "@freediving.ph/types";
import { ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { HomeFeedContext } from "@freediving.ph/types";

const modeLabels: Record<HomeFeedMode, string> = {
  latest: "Latest activity",
  nearby: "Near you",
  chika: "Chika",
  "dive-reports": "Dive reports",
  events: "Events",
};

export function HomeHero({
  context,
  mode,
}: { context: HomeFeedContext; mode: HomeFeedMode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Badge
          variant="outline"
          className="border-border/60 bg-background text-muted-foreground"
        >
          {modeLabels[mode]}
        </Badge>
        <Badge
          variant="outline"
          className="border-emerald-500/40 text-emerald-300"
        >
          <ShieldCheck className="mr-1 h-3.5 w-3.5" />
          {context.safetyBadge}
        </Badge>
      </div>
      <div>
        <h1 className="text-lg font-medium tracking-tight">
          {context.greeting}
        </h1>
        <p className="mt-1 max-w-xl text-xs text-muted-foreground">
          {context.message}
        </p>
      </div>
    </section>
  );
}
