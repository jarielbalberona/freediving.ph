"use client";

import { Card } from "@/components/ui/card";
import type { HomeFeedItem } from "@freediving.ph/types";

type PostPayload = {
  authorName?: string;
  diveSiteName?: string;
  area?: string;
  note?: string;
  current?: string;
  waves?: string;
};

export function PostFeedCard({ item, actions }: { item: HomeFeedItem; actions?: React.ReactNode }) {
  const payload = item.payload as PostPayload;
  return (
    <Card className="p-5">
      <p className="text-base font-semibold">{payload.authorName || "Diver"}</p>
      <p className="text-sm text-muted-foreground">
        {payload.diveSiteName || "Dive spot"}
        {payload.area ? ` · ${payload.area}` : ""}
      </p>
      <p className="mt-3 text-base leading-relaxed">{payload.note || "No report note"}</p>
      <p className="mt-3 text-sm text-muted-foreground bg-muted/30 p-2 rounded-lg inline-block">
        {payload.current ? `Current: ${payload.current}` : ""}
        {payload.waves ? ` · Waves: ${payload.waves}` : ""}
      </p>
      {actions}
    </Card>
  );
}
