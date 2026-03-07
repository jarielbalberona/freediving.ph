"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { HomeFeedItem } from "@freediving.ph/types";

type CommunityPayload = {
  title?: string;
  categoryName?: string;
  replyCount?: number;
  reactionCount?: number;
};

export function CommunityHotCard({ item, actions }: { item: HomeFeedItem; actions?: React.ReactNode }) {
  const payload = item.payload as CommunityPayload;
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <Badge variant="outline">Community hot</Badge>
        <span className="text-sm text-muted-foreground font-medium">{payload.categoryName || "Chika"}</span>
      </div>
      <p className="mt-3 text-lg font-semibold tracking-tight">{payload.title || "Untitled thread"}</p>
      <p className="mt-2 text-sm text-muted-foreground">
        {payload.replyCount ?? 0} replies · {payload.reactionCount ?? 0} reactions
      </p>
      {actions}
    </Card>
  );
}
