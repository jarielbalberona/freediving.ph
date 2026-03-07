"use client";

import { ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { HomeFeedContext } from "@freediving.ph/types";

export function HomeHero({ context }: { context: HomeFeedContext }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-2xl font-medium">{context.greeting}</p>
          <p className="text-sm text-muted-foreground">{context.message}</p>
        </div>
        <Badge variant="outline" className="border-emerald-500/40 text-emerald-300">
          <ShieldCheck className="mr-1 h-3.5 w-3.5" />
          {context.safetyBadge}
        </Badge>
      </div>
    </section>
  );
}
