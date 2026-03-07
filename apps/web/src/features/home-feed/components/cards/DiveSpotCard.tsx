"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { HomeFeedItem } from "@freediving.ph/types";

type DiveSpotPayload = {
  name?: string;
  area?: string;
  entryDifficulty?: string;
  verificationStatus?: string;
  recentUpdateCount?: number;
  saveCount?: number;
};

export function DiveSpotCard({ item, actions }: { item: HomeFeedItem; actions?: React.ReactNode }) {
  const payload = item.payload as DiveSpotPayload;
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold tracking-tight">{payload.name || "Dive spot"}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{payload.area || "Unknown area"}</p>
        </div>
        <Badge variant="outline" className="mt-1">{payload.verificationStatus || "community"}</Badge>
      </div>
      <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
        <p>Difficulty: <span className="font-medium text-foreground">{payload.entryDifficulty || "n/a"}</span></p>
        <p>{payload.recentUpdateCount ?? 0} updates · {payload.saveCount ?? 0} saves</p>
      </div>
      {actions}
    </Card>
  );
}
