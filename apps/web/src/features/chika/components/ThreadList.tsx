"use client";

import type { ChikaThreadView } from "../api/threads";
import { Card, CardContent } from "@/components/ui/card";
import ThreadCard from "./ThreadCard";

interface ThreadListProps {
  threads: ChikaThreadView[];
  isLoading?: boolean;
}

export default function ThreadList({ threads, isLoading }: ThreadListProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 5 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardContent className="p-6">
              <div className="mb-4 h-6 rounded bg-muted" />
              <div className="mb-4 space-y-2">
                <div className="h-4 rounded bg-muted" />
                <div className="h-4 w-3/4 rounded bg-muted" />
              </div>
              <div className="flex items-center justify-between">
                <div className="h-4 w-1/4 rounded bg-muted" />
                <div className="h-4 w-1/4 rounded bg-muted" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 px-6 py-12 text-center">
        <div className="mb-2 text-lg font-semibold text-foreground">
          Start the first Chika
        </div>
        <p className="text-muted-foreground">
          Ask a local question, share a dive update, or help another freediver
          plan safely.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {threads.map((thread) => (
        <ThreadCard key={thread.id} thread={thread} />
      ))}
    </div>
  );
}
