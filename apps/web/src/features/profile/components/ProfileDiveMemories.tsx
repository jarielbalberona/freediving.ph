"use client";

import type { DiveMemory, DiveMemoryVisibility } from "@freediving.ph/types";
import { MessageSquare, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateDiveMemory,
  useDeleteDiveMemory,
  useUpdateDiveMemory,
} from "@/features/profile/hooks/memory-mutations";
import {
  useMyDiveMemoryTagsQuery,
  useProfileDiveMemoriesQuery,
} from "@/features/profile/hooks/queries";

type MemoryDraft = {
  diveSiteId: string;
  title: string;
  body: string;
  visibility: DiveMemoryVisibility;
};

const createEmptyDraft = (diveSiteId = ""): MemoryDraft => ({
  diveSiteId,
  title: "",
  body: "",
  visibility: "public",
});

export function ProfileDiveMemories({
  username,
  isOwner,
  filterDiveSiteId,
  heading = "Dive Memories",
  items: providedItems,
}: {
  username: string;
  isOwner: boolean;
  filterDiveSiteId?: string;
  heading?: string;
  items?: DiveMemory[];
}) {
  const shouldLoadFromProfileQuery = providedItems === undefined;
  const { data, isLoading, isError } = useProfileDiveMemoriesQuery(
    username,
    shouldLoadFromProfileQuery,
  );
  const tagQuery = useMyDiveMemoryTagsQuery(isOwner);
  const createMemory = useCreateDiveMemory(username);
  const updateMemory = useUpdateDiveMemory(username);
  const deleteMemory = useDeleteDiveMemory(username);
  const [draft, setDraft] = useState<MemoryDraft>(() =>
    createEmptyDraft(filterDiveSiteId),
  );
  const [editing, setEditing] = useState<Record<string, MemoryDraft>>({});
  const items = (providedItems ?? data?.items ?? []).filter((item) =>
    filterDiveSiteId ? item.diveSiteId === filterDiveSiteId : true,
  );
  const pendingTagCount =
    tagQuery.data?.items.filter((tag) => tag.status === "pending").length ?? 0;

  useEffect(() => {
    setDraft((current) =>
      current.title || current.body
        ? current
        : createEmptyDraft(filterDiveSiteId),
    );
  }, [filterDiveSiteId]);

  return (
    <section
      aria-labelledby="profile-dive-memories-heading"
      className="space-y-3"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <MessageSquare
            aria-hidden="true"
            className="h-4 w-4 text-muted-foreground"
          />
          <h2
            id="profile-dive-memories-heading"
            className="font-semibold text-base"
          >
            {heading}
          </h2>
        </div>
        <Badge variant="outline">{items.length}</Badge>
      </div>

      {isOwner ? (
        <MemoryForm
          draft={draft}
          isPending={createMemory.isPending}
          lockedDiveSiteId={filterDiveSiteId}
          submitLabel="Add memory"
          onChange={setDraft}
          onSubmit={() => {
            const payload = draftToPayload(draft);
            if (!payload) return;
            createMemory.mutate(payload, {
              onSuccess: () => setDraft(createEmptyDraft(filterDiveSiteId)),
            });
          }}
        />
      ) : null}

      {isOwner ? (
        <div className="rounded-lg border border-border/70 p-3 text-muted-foreground text-sm">
          Tagged memory requests stay private to your account. Pending:{" "}
          <span className="font-medium text-foreground">{pendingTagCount}</span>
        </div>
      ) : null}

      {isLoading && !data ? <MemoryStatus title="Loading memories" /> : null}
      {isError ? <MemoryStatus title="Memories are unavailable" /> : null}
      {!isLoading && !isError && items.length === 0 ? (
        <MemoryStatus
          title={isOwner ? "No memories yet." : "No visible memories yet."}
        />
      ) : null}

      {items.length > 0 ? (
        <ol className="space-y-3">
          {items.map((memory) => {
            const editDraft = editing[memory.id];
            return (
              <li
                key={memory.id}
                className="rounded-lg border border-border/70 p-3"
              >
                {editDraft ? (
                  <MemoryForm
                    draft={editDraft}
                    isPending={updateMemory.isPending}
                    lockedDiveSiteId={filterDiveSiteId}
                    submitLabel="Save memory"
                    onChange={(next) =>
                      setEditing((current) => ({
                        ...current,
                        [memory.id]: next,
                      }))
                    }
                    onSubmit={() => {
                      const payload = draftToPayload(editDraft);
                      if (!payload) return;
                      updateMemory.mutate(
                        { memoryId: memory.id, payload },
                        {
                          onSuccess: () =>
                            setEditing((current) => {
                              const next = { ...current };
                              delete next[memory.id];
                              return next;
                            }),
                        },
                      );
                    }}
                  />
                ) : (
                  <MemoryItem
                    memory={memory}
                    isOwner={isOwner}
                    onEdit={() =>
                      setEditing((current) => ({
                        ...current,
                        [memory.id]: memoryToDraft(memory),
                      }))
                    }
                    onDelete={() => deleteMemory.mutate(memory.id)}
                  />
                )}
              </li>
            );
          })}
        </ol>
      ) : null}
    </section>
  );
}

function MemoryItem({
  memory,
  isOwner,
  onEdit,
  onDelete,
}: {
  memory: DiveMemory;
  isOwner: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <p className="font-medium text-sm">{memory.title}</p>
        {memory.body ? (
          <p className="text-muted-foreground text-sm">{memory.body}</p>
        ) : null}
        <div className="flex flex-wrap gap-2 text-muted-foreground text-xs">
          <span>{formatMemoryDate(memory.occurredAt)}</span>
          <span>{memory.visibility}</span>
          {memory.mediaIds.length > 0 ? (
            <span>{memory.mediaIds.length} media</span>
          ) : null}
        </div>
      </div>
      {isOwner ? (
        <div className="flex shrink-0 gap-1">
          <Button type="button" variant="outline" size="sm" onClick={onEdit}>
            Edit
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Delete dive memory"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function MemoryForm({
  draft,
  isPending,
  lockedDiveSiteId,
  submitLabel,
  onChange,
  onSubmit,
}: {
  draft: MemoryDraft;
  isPending: boolean;
  lockedDiveSiteId?: string;
  submitLabel: string;
  onChange: (draft: MemoryDraft) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      className="space-y-2 rounded-lg border border-border/70 p-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (isPending) return;
        onSubmit();
      }}
    >
      <div className="grid gap-2 sm:grid-cols-[1fr_160px]">
        <input
          value={draft.title}
          onChange={(event) =>
            onChange({ ...draft, title: event.target.value })
          }
          placeholder="Memory title"
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        />
        <select
          value={draft.visibility}
          onChange={(event) =>
            onChange({
              ...draft,
              visibility: event.target.value as DiveMemoryVisibility,
            })
          }
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="public">Public</option>
          <option value="followers">Followers</option>
          <option value="tagged">Tagged</option>
          <option value="private">Private</option>
        </select>
      </div>
      {lockedDiveSiteId ? (
        <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          Dive site is locked to this memory page.
        </div>
      ) : (
        <input
          value={draft.diveSiteId}
          onChange={(event) =>
            onChange({ ...draft, diveSiteId: event.target.value })
          }
          placeholder="Dive site ID"
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
      )}
      <Textarea
        value={draft.body}
        onChange={(event) => onChange({ ...draft, body: event.target.value })}
        placeholder="Add context from the dive"
        className="min-h-20 resize-none"
      />
      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          disabled={!draft.title.trim() || !draft.diveSiteId.trim()}
        >
          {submitLabel === "Save memory" ? (
            <Save className="h-4 w-4" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function MemoryStatus({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-dashed p-4 text-muted-foreground text-sm">
      {title}
    </div>
  );
}

function memoryToDraft(memory: DiveMemory): MemoryDraft {
  return {
    diveSiteId: memory.diveSiteId,
    title: memory.title,
    body: memory.body ?? "",
    visibility: memory.visibility,
  };
}

function draftToPayload(draft: MemoryDraft) {
  const title = draft.title.trim();
  const diveSiteId = draft.diveSiteId.trim();
  if (!title || !diveSiteId) return null;
  return {
    diveSiteId,
    title,
    body: draft.body.trim() || undefined,
    visibility: draft.visibility,
  };
}

function formatMemoryDate(value: string) {
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
