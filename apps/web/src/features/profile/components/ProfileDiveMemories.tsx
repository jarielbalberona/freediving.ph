"use client";

import type {
  DiveMemoriesPageMemoryAttachment,
  DiveMemory,
  DiveMemoryVisibility,
} from "@freediving.ph/types";
import Image from "next/image";
import { EllipsisVertical, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import {
  MomentPlayer,
  momentPlaybackFromUrls,
} from "@/features/media/components/MomentPlayer";
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
  showHeadingIcon = true,
  headingClassName = "font-semibold text-base",
  showCreateComposer = true,
  showOwnerSummary = true,
  attachmentsByMemoryId,
  emptyOwnerTitle = "No memories yet.",
  emptyOwnerDescription,
  emptyVisitorTitle = "No visible memories yet.",
  emptyVisitorDescription,
}: {
  username: string;
  isOwner: boolean;
  filterDiveSiteId?: string;
  heading?: string;
  items?: DiveMemory[];
  showHeadingIcon?: boolean;
  headingClassName?: string;
  showCreateComposer?: boolean;
  showOwnerSummary?: boolean;
  attachmentsByMemoryId?: Record<string, DiveMemoriesPageMemoryAttachment[]>;
  emptyOwnerTitle?: string;
  emptyOwnerDescription?: string;
  emptyVisitorTitle?: string;
  emptyVisitorDescription?: string;
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
          <div className="space-y-1">
            <h2
              id="profile-dive-memories-heading"
              className={headingClassName}
            >
              {heading}
            </h2>
          </div>
        </div>
      </div>

      {isOwner && showCreateComposer ? (
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

      {isOwner && showOwnerSummary ? (
        <div className="rounded-2xl bg-muted/30 px-3 py-2 text-muted-foreground text-sm">
          Tagged memory requests stay private to your account. Pending:{" "}
          <span className="font-medium text-foreground">{pendingTagCount}</span>
        </div>
      ) : null}

      {isLoading && !data ? <MemoryStatus title="Loading memories" /> : null}
      {isError ? <MemoryStatus title="Memories are unavailable" /> : null}
      {!isLoading && !isError && items.length === 0 ? (
        <MemoryStatus
          title={isOwner ? emptyOwnerTitle : emptyVisitorTitle}
          description={
            isOwner ? emptyOwnerDescription : emptyVisitorDescription
          }
        />
      ) : null}

      {items.length > 0 ? (
        <ol className="space-y-2">
          {items.map((memory) => {
            const editDraft = editing[memory.id];
            return (
              <li key={memory.id} className="border-border/50 border-b py-4 first:pt-0 last:border-b-0 last:pb-0">
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
                    attachments={attachmentsByMemoryId?.[memory.id] ?? []}
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
  attachments,
  isOwner,
  onEdit,
  onDelete,
}: {
  memory: DiveMemory;
  attachments: DiveMemoriesPageMemoryAttachment[];
  isOwner: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const attachmentLabel = memory.body?.trim() || memory.title;
  const hasAttachments = attachments.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {memory.body ? (
            <p className="max-w-2xl text-muted-foreground text-sm leading-6">
              {memory.body}
            </p>
          ) : memory.title ? (
            <p className="max-w-2xl text-muted-foreground text-sm leading-6">
              {memory.title}
            </p>
          ) : null}
        </div>
        {isOwner ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Open dive memory actions"
                />
              }
            >
                <EllipsisVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      {!hasAttachments ? (
        <p className="text-muted-foreground text-xs">
          {formatMemoryDate(memory.occurredAt)}
        </p>
      ) : null}

      {hasAttachments ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {attachments.map((attachment) => (
            <MemoryAttachmentTile
              key={attachment.id}
              attachment={attachment}
              title={attachmentLabel}
            />
          ))}
        </div>
      ) : null}

      {hasAttachments ? (
        <p className="text-muted-foreground text-xs">
          {formatMemoryDate(memory.occurredAt)}
        </p>
      ) : null}
    </div>
  );
}

function MemoryAttachmentTile({
  attachment,
  title,
}: {
  attachment: DiveMemoriesPageMemoryAttachment;
  title: string;
}) {
  if (!attachment.media.url) return null;

  if (attachment.media.type === "video") {
    const playback = momentPlaybackFromUrls({
      playbackUrl: attachment.media.url,
    });
    return (
      <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-muted/20">
        <MomentPlayer
          hlsUrl={playback.hlsUrl}
          iframeUrl={playback.iframeUrl}
          posterUrl={playback.posterUrl}
          title={title}
          muted
          controls
          playsInline
          videoClassName="h-full w-full object-cover"
          iframeClassName="h-full w-full"
        />
      </div>
    );
  }

  return (
    <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-muted/20">
      <Image
        src={attachment.media.url}
        alt={title}
        width={attachment.media.width}
        height={attachment.media.height}
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        className="h-full w-full object-cover"
        unoptimized
      />
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
      className="space-y-2 rounded-2xl border border-border/70 bg-background/70 p-3"
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

function MemoryStatus({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 p-4 text-sm">
      <div className="space-y-1">
        <p className="font-medium text-foreground">{title}</p>
        {description ? (
          <p className="text-muted-foreground">{description}</p>
        ) : null}
      </div>
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
