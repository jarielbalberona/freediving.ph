"use client";

import { Film, LoaderCircle, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DiveSiteCombobox,
  formatDiveSiteOptionLabel,
} from "@/features/diveSpots/components/DiveSiteCombobox";
import {
  useCompleteMomentUpload,
  useCreateMomentUploadIntent,
  useSyncMomentStatus,
} from "@/features/media/hooks";
import type { ExploreSiteCard } from "@freediving.ph/types";

const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/quicktime"]);

type UploadState = "idle" | "uploading" | "processing" | "ready" | "failed";

export function MomentUploadPanel() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [site, setSite] = useState<ExploreSiteCard | null>(null);
  const [progress, setProgress] = useState(0);
  const [state, setState] = useState<UploadState>("idle");
  const [postId, setPostId] = useState<string | null>(null);
  const createIntent = useCreateMomentUploadIntent();
  const completeUpload = useCompleteMomentUpload();
  const syncStatus = useSyncMomentStatus();

  function chooseFile(nextFile: File | null) {
    if (!nextFile) return;
    if (!ALLOWED_VIDEO_TYPES.has(nextFile.type)) {
      toast.error("Use an MP4 or MOV video for Moments.");
      return;
    }
    if (nextFile.size > MAX_VIDEO_BYTES) {
      toast.error("Moments must be 200 MB or smaller.");
      return;
    }
    setFile(nextFile);
    setState("idle");
    setProgress(0);
  }

  async function uploadMoment() {
    if (!file) {
      toast.error("Choose a video first.");
      return;
    }
    setState("uploading");
    setProgress(0);
    try {
      const intent = await createIntent.mutateAsync({
        caption: caption.trim() || null,
        diveSiteId: site?.id ?? null,
        filename: file.name,
        contentType: file.type,
      });
      setPostId(intent.postId);
      await uploadToCloudflare(intent.uploadUrl, file, setProgress);
      const completed = await completeUpload.mutateAsync(intent.postId);
      setState(completed.status === "ready" ? "ready" : "processing");
      toast.success(
        completed.status === "ready"
          ? "Moment published."
          : "Your Moment is processing and will appear once it's ready.",
      );
    } catch (error) {
      setState("failed");
      toast.error(
        error instanceof Error
          ? error.message
          : "We couldn't process this Moment. Please try another video.",
      );
    }
  }

  async function refreshStatus() {
    if (!postId) return;
    const result = await syncStatus.mutateAsync(postId);
    setState(result.status === "ready" ? "ready" : result.status === "failed" ? "failed" : "processing");
    if (result.status === "ready") toast.success("Moment is ready.");
    if (result.status === "failed") {
      toast.error("We couldn't process this Moment. Please try another video.");
    }
  }

  const busy =
    createIntent.isPending ||
    completeUpload.isPending ||
    syncStatus.isPending ||
    state === "uploading";

  return (
    <Card className="rounded-[0.5rem]">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-8 items-center justify-center rounded-full bg-sky-500/10 text-sky-800">
            <Film className="size-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold">Create a Moment</h2>
            <p className="text-sm text-muted-foreground">
              Share one short video, up to 30 seconds.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="moment-video">Video</Label>
          <input
            ref={inputRef}
            id="moment-video"
            type="file"
            accept="video/mp4,video/quicktime,.mp4,.mov"
            className="hidden"
            onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            <UploadCloud className="size-4" />
            {file ? file.name : "Choose video"}
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="moment-caption">Caption</Label>
          <Textarea
            id="moment-caption"
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Add a caption"
            disabled={busy}
          />
        </div>

        <DiveSiteCombobox
          id="moment-dive-site"
          value={site?.id ?? ""}
          valueLabel={site ? formatDiveSiteOptionLabel(site) : undefined}
          onValueChange={(_, selectedSite) => setSite(selectedSite)}
          searchPlaceholder="Attach a dive site"
          disabled={busy}
        />

        {state === "uploading" ? (
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-sky-600 transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
        ) : null}

        {state === "processing" ? (
          <Alert>
            <AlertTitle>Your Moment is processing</AlertTitle>
            <AlertDescription>
              It will appear on your profile and in the feed once it's ready.
            </AlertDescription>
          </Alert>
        ) : null}

        {state === "failed" ? (
          <Alert variant="destructive">
            <AlertTitle>Moment failed</AlertTitle>
            <AlertDescription>
              We couldn't process this Moment. Please try another video.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={uploadMoment} disabled={!file || busy}>
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Upload Moment
          </Button>
          {postId && state === "processing" ? (
            <Button type="button" variant="outline" onClick={refreshStatus}>
              Check status
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function uploadToCloudflare(
  uploadUrl: string,
  file: File,
  onProgress: (progress: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error("Moment upload failed."));
      }
    };
    xhr.onerror = () => reject(new Error("Moment upload failed."));
    xhr.send(formData);
  });
}
