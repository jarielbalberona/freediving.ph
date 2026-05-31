"use client";

import type { MediaContextType } from "@freediving.ph/types";
import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { useId, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { useUploadMedia } from "../hooks/mutations";

type ImageKind = "logo" | "cover";

type SaveEntityImagesInput = {
  logoMediaId?: string | null;
  coverMediaId?: string | null;
};

type EntityLogoCoverSettingsProps = {
  title?: string;
  logoUrl?: string | null;
  coverUrl?: string | null;
  logoMediaId?: string | null;
  coverMediaId?: string | null;
  logoContext: MediaContextType;
  coverContext: MediaContextType;
  contextId: string;
  disabled?: boolean;
  isSaving?: boolean;
  onSave: (input: SaveEntityImagesInput) => Promise<unknown>;
};

export function EntityLogoCoverSettings({
  title = "Images",
  logoUrl,
  coverUrl,
  logoMediaId,
  coverMediaId,
  logoContext,
  coverContext,
  contextId,
  disabled = false,
  isSaving = false,
  onSave,
}: EntityLogoCoverSettingsProps) {
  const uploadMedia = useUploadMedia();
  const [busyKind, setBusyKind] = useState<ImageKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pending = isSaving || uploadMedia.isPending || busyKind !== null;

  const saveImage = async (kind: ImageKind, file: File) => {
    setError(null);
    setBusyKind(kind);
    try {
      const upload = await uploadMedia.mutateAsync({
        file,
        contextType: kind === "logo" ? logoContext : coverContext,
        contextId,
      });
      await onSave(
        kind === "logo"
          ? { logoMediaId: upload.id }
          : { coverMediaId: upload.id },
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : `Failed to update ${kind === "logo" ? "logo" : "cover photo"}.`,
      );
    } finally {
      setBusyKind(null);
    }
  };

  const removeImage = async (kind: ImageKind) => {
    setError(null);
    setBusyKind(kind);
    try {
      await onSave(kind === "logo" ? { logoMediaId: null } : { coverMediaId: null });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : `Failed to remove ${kind === "logo" ? "logo" : "cover photo"}.`,
      );
    } finally {
      setBusyKind(null);
    }
  };

  return (
    <Card size="sm" data-management-entity-images>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">
            Manage the identity image and wide header image for this workspace.
          </p>
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-3 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <EntityImageField
            kind="logo"
            label="Logo"
            helpText="Used in cards, switchers, and compact headers."
            currentUrl={logoUrl}
            currentMediaId={logoMediaId}
            pending={pending}
            busy={busyKind === "logo"}
            disabled={disabled}
            onUpload={saveImage}
            onRemove={removeImage}
          />
          <EntityImageField
            kind="cover"
            label="Cover photo"
            helpText="Used as the wide header image on public and management pages."
            currentUrl={coverUrl}
            currentMediaId={coverMediaId}
            pending={pending}
            busy={busyKind === "cover"}
            disabled={disabled}
            onUpload={saveImage}
            onRemove={removeImage}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function EntityImageField({
  kind,
  label,
  helpText,
  currentUrl,
  currentMediaId,
  pending,
  busy,
  disabled,
  onUpload,
  onRemove,
}: {
  kind: ImageKind;
  label: string;
  helpText: string;
  currentUrl?: string | null;
  currentMediaId?: string | null;
  pending: boolean;
  busy: boolean;
  disabled: boolean;
  onUpload: (kind: ImageKind, file: File) => void;
  onRemove: (kind: ImageKind) => void;
}) {
  const inputId = useId();
  const hasImage = Boolean(currentUrl);
  const canRemove = Boolean(currentMediaId);

  return (
    <section className="space-y-3 rounded-xl border border-border/70 bg-background/60 p-3">
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-foreground">{label}</h3>
        <p className="text-xs leading-5 text-muted-foreground">{helpText}</p>
      </div>

      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-border/70 bg-gradient-to-br from-muted via-background to-muted/40",
          kind === "logo" ? "aspect-square max-w-40" : "aspect-[16/7] w-full",
        )}
      >
        {hasImage ? (
          <img
            src={currentUrl ?? undefined}
            alt={`${label} preview`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full place-items-center text-muted-foreground">
            <div className="grid gap-2 text-center text-xs">
              <ImageIcon className="mx-auto size-5" />
              <span>No {label.toLowerCase()} yet</span>
            </div>
          </div>
        )}
      </div>

      <Input
        id={inputId}
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={disabled || pending}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onUpload(kind, file);
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || pending}
          nativeButton={false}
          render={<label htmlFor={inputId} />}
        >
          {busy ? <Loader2 className="animate-spin" /> : <Upload />}
          {hasImage ? "Replace" : "Upload"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={disabled || pending || !canRemove}
          onClick={() => onRemove(kind)}
        >
          <Trash2 />
          Remove
        </Button>
      </div>
    </section>
  );
}
