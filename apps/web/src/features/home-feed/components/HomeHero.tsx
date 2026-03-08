"use client";

import type { HomeFeedMode } from "@freediving.ph/types";
import { ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { HomeFeedContext } from "@freediving.ph/types";

const modeLabels: Record<HomeFeedMode, string> = {
  following: "Relationship feed",
  nearby: "Local action feed",
  training: "Training feed",
  "spot-reports": "Operational feed",
};

export function HomeHero({
  context,
  mode,
}: { context: HomeFeedContext; mode: HomeFeedMode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Badge
            variant="outline"
            className="border-border/60 bg-background text-muted-foreground"
          >
            {modeLabels[mode]}
          </Badge>
          <div>
            <h1 className="text-2xl font-medium tracking-tight">
              {context.greeting}
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              {context.message}
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="border-emerald-500/40 text-emerald-300"
        >
          <ShieldCheck className="mr-1 h-3.5 w-3.5" />
          {context.safetyBadge}
        </Badge>
      </div>
    </section>
  );
}
