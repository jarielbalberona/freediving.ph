"use client";

import type { MediaContextType } from "@freediving.ph/types";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useUploadMultipleMedia } from "../hooks";

interface MediaUploadPanelProps {
  defaultContextType?: MediaContextType;
  defaultContextId?: string;
}

export function MediaUploadPanel({
  defaultContextType = "profile_feed",
  defaultContextId,
}: MediaUploadPanelProps) {
  const [contextType, setContextType] = useState<MediaContextType>(defaultContextType);
  const [contextId, setContextId] = useState(defaultContextId ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const mutation = useUploadMultipleMedia();

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contextType">Context Type</Label>
          <select
            id="contextType"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={contextType}
            onChange={(event) => setContextType(event.target.value as MediaContextType)}
          >
            <option value="profile_avatar">profile_avatar</option>
            <option value="profile_feed">profile_feed</option>
            <option value="chika_attachment">chika_attachment</option>
            <option value="event_attachment">event_attachment</option>
            <option value="dive_spot_attachment">dive_spot_attachment</option>
            <option value="group_cover">group_cover</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="contextId">Context ID (optional)</Label>
          <Input
            id="contextId"
            value={contextId}
            onChange={(event) => setContextId(event.target.value)}
            placeholder="UUID for context-bound uploads"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="files">Files</Label>
        <Input
          id="files"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
        />
      </div>

      <Button
        disabled={files.length === 0 || mutation.isPending}
        onClick={() =>
          mutation.mutate({
            files,
            contextType,
            contextId: contextId.trim() || undefined,
          })
        }
      >
        {mutation.isPending ? "Uploading..." : `Upload ${files.length || ""} file(s)`}
      </Button>

      {mutation.data?.errors?.length ? (
        <div className="space-y-1 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {mutation.data.errors.map((error) => (
            <p key={`${error.index}-${error.code}`}>
              File #{error.index + 1}: {error.message}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
