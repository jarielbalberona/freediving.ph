"use client";

import Hls from "hls.js";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export type MomentPlayback = {
  provider: "cloudflare_stream";
  iframeUrl?: string | null;
  hlsUrl?: string | null;
  posterUrl?: string | null;
};

export type MomentPlayerProps = {
  hlsUrl?: string | null;
  iframeUrl?: string | null;
  posterUrl?: string | null;
  title?: string;
  muted?: boolean;
  autoPlay?: boolean;
  controls?: boolean;
  loop?: boolean;
  playsInline?: boolean;
  className?: string;
  videoClassName?: string;
  iframeClassName?: string;
  onReady?: () => void;
  onError?: (error: unknown) => void;
};

type PlaybackMode = "video" | "iframe" | "unavailable";

export function MomentPlayer({
  hlsUrl,
  iframeUrl,
  posterUrl,
  title = "Moment",
  muted = true,
  autoPlay = false,
  controls = false,
  loop = false,
  playsInline = true,
  className,
  videoClassName,
  iframeClassName,
  onReady,
  onError,
}: MomentPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  const [mode, setMode] = useState<PlaybackMode>(
    hlsUrl ? "video" : iframeUrl ? "iframe" : "unavailable",
  );

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    setMode(hlsUrl ? "video" : iframeUrl ? "iframe" : "unavailable");
  }, [hlsUrl, iframeUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!hlsUrl || !video) {
      setMode(iframeUrl ? "iframe" : "unavailable");
      return;
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = hlsUrl;
      setMode("video");
      return () => {
        video.removeAttribute("src");
        video.load();
      };
    }

    if (!Hls.isSupported()) {
      setMode(iframeUrl ? "iframe" : "unavailable");
      return;
    }

    const hls = new Hls();
    setMode("video");
    hls.loadSource(hlsUrl);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      onReadyRef.current?.();
    });
    hls.on(Hls.Events.ERROR, (_event, data) => {
      onErrorRef.current?.(data);
      if (data.fatal && iframeUrl) {
        setMode("iframe");
      }
    });

    return () => {
      hls.destroy();
    };
  }, [hlsUrl, iframeUrl]);

  if (mode === "iframe" && iframeUrl) {
    return (
      <div className={cn("h-full w-full", className)}>
        <iframe
          src={buildStreamIframeUrl(iframeUrl, { muted, autoPlay, loop })}
          title={title}
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          className={cn("h-full w-full", iframeClassName)}
        />
      </div>
    );
  }

  if (mode === "unavailable") {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center bg-muted text-sm text-muted-foreground",
          className,
        )}
      >
        This Moment is unavailable.
      </div>
    );
  }

  return (
    <div className={cn("h-full w-full", className)}>
      <video
        ref={videoRef}
        poster={posterUrl ?? undefined}
        muted={muted}
        autoPlay={autoPlay}
        controls={controls}
        loop={loop}
        playsInline={playsInline}
        preload="metadata"
        className={cn("h-full w-full", videoClassName)}
        onLoadedMetadata={() => onReadyRef.current?.()}
        onError={(event) => onErrorRef.current?.(event.currentTarget.error)}
      />
    </div>
  );
}

export function momentPlaybackFromUrls(input: {
  playbackUrl?: string | null;
  posterUrl?: string | null;
}): MomentPlayback {
  const playbackUrl = input.playbackUrl?.trim() || "";
  const playbackUID = extractCloudflareStreamUID(playbackUrl);
  return {
    provider: "cloudflare_stream",
    iframeUrl: playbackUID
      ? `https://iframe.videodelivery.net/${playbackUID}`
      : null,
    hlsUrl: playbackUID
      ? `https://videodelivery.net/${playbackUID}/manifest/video.m3u8`
      : null,
    posterUrl: input.posterUrl ?? null,
  };
}

function extractCloudflareStreamUID(url: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (
      parsed.hostname === "iframe.videodelivery.net" ||
      parsed.hostname === "videodelivery.net"
    ) {
      const uid = parsed.pathname.split("/").filter(Boolean)[0];
      return uid || null;
    }
  } catch {
    return null;
  }
  return null;
}

function buildStreamIframeUrl(
  iframeUrl: string,
  options: { muted: boolean; autoPlay: boolean; loop: boolean },
): string {
  try {
    const parsed = new URL(iframeUrl);
    parsed.searchParams.set("muted", String(options.muted));
    parsed.searchParams.set("preload", "true");
    if (options.autoPlay) parsed.searchParams.set("autoplay", "true");
    if (options.loop) parsed.searchParams.set("loop", "true");
    return parsed.toString();
  } catch {
    return iframeUrl;
  }
}
