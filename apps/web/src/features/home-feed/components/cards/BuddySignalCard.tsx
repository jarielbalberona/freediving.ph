"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { HomeFeedItem } from "@freediving.ph/types";

type BuddyPayload = {
  authorName?: string;
  area?: string;
  intentType?: string;
  timeWindow?: string;
  note?: string;
};

export function BuddySignalCard({ item, actions }: { item: HomeFeedItem; actions?: React.ReactNode }) {
  const payload = item.payload as BuddyPayload;
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">Buddy signal</Badge>
        <span className="text-sm font-medium text-muted-foreground">{payload.timeWindow || "time flexible"}</span>
      </div>
      <div className="mt-3">
        <p className="text-lg font-semibold">{payload.authorName || "Diver"}</p>
        <p className="text-sm text-muted-foreground mt-0.5">
          {payload.area || "Unknown area"} · <span className="font-medium text-foreground">{payload.intentType || "fun_dive"}</span>
        </p>
      </div>
      {payload.note ? <p className="mt-3 text-base leading-relaxed text-foreground/90">{payload.note}</p> : null}
      {actions}
    </Card>
  );
}
