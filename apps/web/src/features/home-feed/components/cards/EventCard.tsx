"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { HomeFeedItem } from "@freediving.ph/types";

type EventPayload = {
  title?: string;
  memberCount?: number;
  viewerMember?: boolean;
};

export function EventCard({ item, actions }: { item: HomeFeedItem; actions?: React.ReactNode }) {
  const payload = item.payload as EventPayload;
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <Badge variant="outline" className="px-2.5 py-0.5">Event</Badge>
        <span className="text-sm text-muted-foreground font-medium">{payload.memberCount ?? 0} members</span>
      </div>
      <p className="mt-3 text-lg font-semibold tracking-tight">{payload.title || "Untitled event"}</p>
      {payload.viewerMember ? <p className="mt-2 text-sm font-medium text-emerald-600 flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        You are attending
      </p> : null}
      {actions}
    </Card>
  );
}
