"use client";

import type { JourneyEntry } from "@freediving.ph/types";
import { Clock3, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateJourneyEntry,
  useDeleteJourneyEntry,
} from "@/features/profile/hooks/journey-mutations";
import { useProfileJourneyQuery } from "@/features/profile/hooks/queries";

export function ProfileJourney({
  username,
  isOwner,
}: {
  username: string;
  isOwner: boolean;
}) {
  const { data, isLoading, isError } = useProfileJourneyQuery(username);
  const createEntry = useCreateJourneyEntry(username);
  const deleteEntry = useDeleteJourneyEntry(username);
  const [draft, setDraft] = useState("");
  const items = data?.items ?? [];

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-base">Journey</h2>
        </div>
        <Badge variant="outline">{items.length}</Badge>
      </div>

      {isOwner ? (
        <form
          className="space-y-2 rounded-lg border border-border/70 p-3"
          onSubmit={(event) => {
            event.preventDefault();
            const title = draft.trim();
            if (!title || createEntry.isPending) return;
            createEntry.mutate(
              { title, visibility: "public" },
              { onSuccess: () => setDraft("") },
            );
          }}
        >
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Add a journey note"
            className="min-h-20 resize-none"
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={!draft.trim()}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </form>
      ) : null}

      {isLoading && !data ? <JourneyStatus title="Loading journey" /> : null}
      {isError ? <JourneyStatus title="Journey is unavailable" /> : null}
      {!isLoading && !isError && items.length === 0 ? (
        <JourneyStatus
          title={isOwner ? "No journey entries yet." : "No visible journey yet."}
        />
      ) : null}
      {items.length > 0 ? (
        <ol className="space-y-3">
          {items.map((item) => (
            <JourneyItem
              key={item.id}
              item={item}
              isOwner={isOwner}
              onDelete={() => deleteEntry.mutate(item.id)}
            />
          ))}
        </ol>
      ) : null}
    </section>
  );
}

function JourneyItem({
  item,
  isOwner,
  onDelete,
}: {
  item: JourneyEntry;
  isOwner: boolean;
  onDelete: () => void;
}) {
  return (
    <li className="rounded-lg border border-border/70 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-medium text-sm">{item.title}</p>
          {item.body ? (
            <p className="text-muted-foreground text-sm">{item.body}</p>
          ) : null}
          <div className="flex flex-wrap gap-2 text-muted-foreground text-xs">
            <span>{formatJourneyDate(item.occurredAt)}</span>
            <span>{item.visibility}</span>
            {item.mediaIds.length > 0 ? (
              <span>{item.mediaIds.length} media</span>
            ) : null}
          </div>
        </div>
        {isOwner && item.type === "custom" ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Delete journey entry"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </li>
  );
}

function JourneyStatus({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-dashed p-4 text-muted-foreground text-sm">
      {title}
    </div>
  );
}

function formatJourneyDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
