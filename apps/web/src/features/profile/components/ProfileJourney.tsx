"use client";

import type {
  JourneyEntry,
  UpdateManualJourneyEntryRequest,
} from "@freediving.ph/types";
import {
  Award,
  Camera,
  GraduationCap,
  MapPinned,
  NotebookPen,
  Pencil,
  Plus,
  Route,
  Timer,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ProfileTabHeader } from "@/features/profile/components/ProfileTabHeader";
import {
  useCreateJourneyEntry,
  useDeleteJourneyEntry,
  useUpdateJourneyEntry,
} from "@/features/profile/hooks/journey-mutations";
import { useMintedMediaMap } from "@/features/media/hooks/queries";
import {
  useProfileBadgesQuery,
  useProfileJourneyQuery,
} from "@/features/profile/hooks/queries";

type ManualJourneyFormState = {
  title: string;
  body: string;
  occurredOn: string;
};

const EMPTY_MANUAL_FORM: ManualJourneyFormState = {
  title: "",
  body: "",
  occurredOn: todayInputValue(),
};

export function ProfileJourney({
  username,
  isOwner,
}: {
  username: string;
  isOwner: boolean;
}) {
  const { data, isLoading, isError } = useProfileJourneyQuery(username);
  const badgesQuery = useProfileBadgesQuery(username);
  const createEntry = useCreateJourneyEntry(username);
  const updateEntry = useUpdateJourneyEntry(username);
  const deleteEntry = useDeleteJourneyEntry(username);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<JourneyEntry | null>(null);
  const items = data?.items ?? [];
  const groups = groupJourneyEntries(items);
  const previewMediaIds = collectJourneyPreviewMediaIds(items);
  const previewUrls = useMintedMediaMap(previewMediaIds, "thumb", true);
  const badgeImageMap = buildJourneyBadgeImageMap(badgesQuery.data);

  const isEditing = editingItem !== null;
  const dialogTitle = isEditing ? "Edit journey note" : "Add journey note";
  const dialogDescription = isEditing
    ? "Update the note headline, context, and story date."
    : "Share a dive milestone, memory, or lesson from your journey.";

  return (
    <section className="space-y-4">
      <ProfileTabHeader
        title="Journey"
        subtitle="Story notes and milestones from your diving path."
        icon={<Route className="h-4 w-4" />}
        action={
          <div className="flex items-center gap-2">
            {isOwner ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingItem(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Add journey note
              </Button>
            ) : null}
          </div>
        }
      />

      <JourneyNoteDialog
        open={dialogOpen}
        item={editingItem}
        title={dialogTitle}
        description={dialogDescription}
        disabled={createEntry.isPending || updateEntry.isPending}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingItem(null);
          }
        }}
        onSubmit={(payload) => {
          if (editingItem) {
            updateEntry.mutate(
              {
                entryId: editingItem.id,
                payload: {
                  ...payload,
                  visibility: editingItem.visibility,
                },
              },
              {
                onSuccess: () => {
                  setDialogOpen(false);
                  setEditingItem(null);
                },
              },
            );
            return;
          }
          createEntry.mutate(
            {
              ...payload,
              visibility: "public",
            },
            {
              onSuccess: () => {
                setDialogOpen(false);
              },
            },
          );
        }}
      />

      {isLoading && !data ? <JourneyStatus title="Loading journey" /> : null}
      {isError ? <JourneyStatus title="Journey is unavailable" /> : null}
      {!isLoading && !isError && items.length === 0 ? (
        <JourneyStatus
          title={
            isOwner
              ? "Your Journey will fill from dive posts, Dive Memories, badges, and manual notes."
              : "This diver has not shared journey milestones yet."
          }
        />
      ) : null}

      {groups.length > 0 ? (
        <div className="space-y-4">
          {groups.map((group) => (
            <section key={group.label} className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border/60" />
                <p className="shrink-0 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {group.label}
                </p>
                <div className="h-px flex-1 bg-border/60" />
              </div>

              <ol className="space-y-2">
                {group.items.map((item, index) => (
                  <JourneyTimelineItem
                    key={item.id}
                    item={item}
                    isOwner={isOwner}
                    isLast={index === group.items.length - 1}
                    isDeleting={deleteEntry.isPending}
                    previewSrc={previewSourceForItem(
                      item,
                      previewUrls.urlMap,
                      badgeImageMap,
                    )}
                    onEdit={() => {
                      setEditingItem(item);
                      setDialogOpen(true);
                    }}
                    onDelete={() => deleteEntry.mutate(item.id)}
                  />
                ))}
              </ol>
            </section>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function JourneyTimelineItem({
  item,
  isOwner,
  isLast,
  isDeleting,
  previewSrc,
  onEdit,
  onDelete,
}: {
  item: JourneyEntry;
  isOwner: boolean;
  isLast: boolean;
  isDeleting: boolean;
  previewSrc?: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = journeyMeta(item);
  const canManageManual = isOwner && item.type === "custom";
  const mediaIds = item.mediaIds ?? [];

  return (
    <li className="grid grid-cols-[auto_1fr] gap-2.5">
      <div className="flex flex-col items-center">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full border ${meta.iconTone}`}
        >
          <meta.Icon className="h-3.5 w-3.5" />
        </div>
        {!isLast ? <div className="mt-1.5 h-full w-px bg-border/60" /> : null}
      </div>

      <div
        className={`space-y-1.5 border-b border-border/60 pb-3 ${isLast ? "border-b-0 pb-0" : ""
          }`}
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant={meta.generated ? "secondary" : "outline"}
                className="h-5 rounded-md px-1.5 text-[10px]"
              >
                {meta.label}
              </Badge>
            </div>
            <p className="text-[13px] font-medium leading-5">{item.title}</p>
            {journeyBody(item) ? (
              <p className="text-[12px] leading-5 text-muted-foreground">
                {journeyBody(item)}
              </p>
            ) : null}
          </div>

          <div className="flex items-start gap-2">
            {previewSrc ? (
              <JourneyPreviewImage src={previewSrc} alt={item.title} />
            ) : null}

            {canManageManual ? (
              <div className="flex items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={onEdit}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span className="sr-only">Edit journey entry</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Delete journey entry"
                  disabled={isDeleting}
                  onClick={onDelete}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
          <span>{formatJourneyDate(item.occurredAt)}</span>
          {mediaIds.length > 0 ? (
            <span>{formatMediaCount(mediaIds.length)}</span>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function JourneyPreviewImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="h-[52px] w-[52px] shrink-0 overflow-hidden rounded-md">
      <img
        src={src}
        alt={`${alt} preview`}
        className="h-full w-full object-cover"
        loading="lazy"
      />
    </div>
  );
}

function JourneyNoteDialog({
  open,
  item,
  title,
  description,
  disabled,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  item: JourneyEntry | null;
  title: string;
  description: string;
  disabled: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: UpdateManualJourneyEntryRequest) => void;
}) {
  const [form, setForm] = useState<ManualJourneyFormState>(EMPTY_MANUAL_FORM);

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_MANUAL_FORM);
      return;
    }
    setForm(item ? manualStateFromEntry(item) : EMPTY_MANUAL_FORM);
  }, [item, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-4 rounded-3xl p-5 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!form.title.trim()) return;
            onSubmit(formStateToPayload(form));
          }}
        >
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Headline
            </label>
            <Input
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="Milestone title"
              disabled={disabled}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Context
            </label>
            <Textarea
              value={form.body}
              onChange={(event) =>
                setForm((current) => ({ ...current, body: event.target.value }))
              }
              placeholder="Add context that belongs in your Journey: what changed, what you learned, or why the milestone mattered."
              className="min-h-28 resize-none"
              disabled={disabled}
            />
          </div>

          <div className="space-y-1.5">
            <label
              className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
              htmlFor="journey-note-date"
            >
              Story date
            </label>
            <Input
              id="journey-note-date"
              type="date"
              value={form.occurredOn}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  occurredOn: event.target.value,
                }))
              }
              disabled={disabled}
            />
          </div>

          <DialogFooter className="pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={disabled || !form.title.trim()}>
              {item ? "Save changes" : "Add journey note"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function JourneyStatus({ title }: { title: string }) {
  return (
    <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
      {title}
    </div>
  );
}

function journeyMeta(item: JourneyEntry) {
  if (item.type === "custom") {
    return {
      label: "Manual note",
      generated: false,
      Icon: NotebookPen,
      iconTone: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }
  if (item.type === "map_milestone") {
    return {
      label: "Dive site visit",
      generated: true,
      Icon: MapPinned,
      iconTone: "border-sky-200 bg-sky-50 text-sky-700",
    };
  }
  if (item.type === "media") {
    return {
      label: "Media post",
      generated: true,
      Icon: Camera,
      iconTone: "border-cyan-200 bg-cyan-50 text-cyan-700",
    };
  }
  if (item.type === "memory") {
    return {
      label: "Dive memory",
      generated: true,
      Icon: NotebookPen,
      iconTone: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }
  if (item.title.startsWith("Logged a new PB:")) {
    return {
      label: "Personal best",
      generated: true,
      Icon: Timer,
      iconTone: "border-orange-200 bg-orange-50 text-orange-700",
    };
  }
  if (item.title.startsWith("Added ")) {
    return {
      label: "Certification",
      generated: true,
      Icon: GraduationCap,
      iconTone: "border-violet-200 bg-violet-50 text-violet-700",
    };
  }
  return {
    label: "Badge earned",
    generated: true,
    Icon: Award,
    iconTone: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
  };
}

function groupJourneyEntries(items: JourneyEntry[]) {
  const groups = new Map<string, JourneyEntry[]>();
  for (const item of items) {
    const key = monthLabel(item.occurredAt);
    const bucket = groups.get(key) ?? [];
    bucket.push(item);
    groups.set(key, bucket);
  }
  return Array.from(groups.entries()).map(([label, groupItems]) => ({
    label,
    items: groupItems,
  }));
}

function formStateToPayload(
  value: ManualJourneyFormState,
): UpdateManualJourneyEntryRequest {
  return {
    title: value.title.trim(),
    body: value.body.trim() || undefined,
    occurredAt: value.occurredOn ? `${value.occurredOn}T12:00:00Z` : undefined,
  };
}

function manualStateFromEntry(item: JourneyEntry): ManualJourneyFormState {
  return {
    title: item.title,
    body: item.body ?? "",
    occurredOn: inputDateValue(item.occurredAt),
  };
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
    timeZone: "UTC",
  }).format(date);
}

function monthLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function inputDateValue(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return todayInputValue();
  }
  return date.toISOString().slice(0, 10);
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function formatMediaCount(count: number) {
  return count === 1 ? "1 media item" : `${count} media items`;
}

function journeyBody(item: JourneyEntry) {
  if (item.type === "map_milestone") {
    return "";
  }
  return item.body ?? "";
}

function collectJourneyPreviewMediaIds(items: JourneyEntry[]) {
  const ids = new Set<string>();
  for (const item of items) {
    const mediaId = item.coverMediaId || item.mediaIds?.[0];
    if (mediaId) {
      ids.add(mediaId);
    }
  }
  return Array.from(ids);
}

function previewSourceForItem(
  item: JourneyEntry,
  mediaUrlMap: Map<string, string>,
  badgeImageMap: Map<string, string>,
) {
  if (item.sourceType === "badge" && item.sourceId) {
    const badgeImage = badgeImageMap.get(item.sourceId);
    if (badgeImage) {
      return badgeImage;
    }
  }

  const mediaId = item.coverMediaId || item.mediaIds?.[0];
  if (!mediaId) {
    return undefined;
  }
  return mediaUrlMap.get(mediaId);
}

function buildJourneyBadgeImageMap(
  badges:
    | {
      badges: Array<{ id: string; template: { badgeImageUrl?: string } }>;
      autoStats: Array<{ id: string; template: { badgeImageUrl?: string } }>;
    }
    | undefined,
) {
  const map = new Map<string, string>();
  for (const item of [
    ...(badges?.badges ?? []),
    ...(badges?.autoStats ?? []),
  ]) {
    const src = normalizeJourneyPreviewSrc(item.template.badgeImageUrl);
    if (src) {
      map.set(item.id, src);
    }
  }
  return map;
}

function normalizeJourneyPreviewSrc(value?: string) {
  const src = value?.trim() ?? "";
  if (!src) return "";
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  return src.startsWith("/") ? src : `/${src}`;
}
