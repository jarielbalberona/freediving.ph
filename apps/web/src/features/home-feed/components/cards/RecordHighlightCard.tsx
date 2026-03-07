"use client";

import { Card } from "@/components/ui/card";
import type { HomeFeedItem } from "@freediving.ph/types";

export function RecordHighlightCard({ item, actions }: { item: HomeFeedItem; actions?: React.ReactNode }) {
  return (
    <Card className="p-5">
      <p className="text-base font-semibold text-primary">Record highlight</p>
      <p className="mt-2 text-sm text-muted-foreground">Entity #{item.entityId}</p>
      {actions}
    </Card>
  );
}
