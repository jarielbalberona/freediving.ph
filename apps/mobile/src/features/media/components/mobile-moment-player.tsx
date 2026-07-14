import { VideoView, useVideoPlayer } from "expo-video";
import { useEffect, useMemo, useState } from "react";
import { AppState, StyleSheet, Text, View } from "react-native";

import type { MomentPlayback } from "@freediving.ph/types";

export const momentHlsUrl = (input: {
  playback?: MomentPlayback | null;
  playbackUrl?: string | null;
}) => {
  const structured = input.playback?.hlsUrl?.trim();
  if (structured) return structured;
  const legacy = input.playbackUrl?.trim();
  if (!legacy) return undefined;
  try {
    const parsed = new URL(legacy);
    if (
      parsed.hostname === "iframe.videodelivery.net" ||
      parsed.hostname.endsWith(".cloudflarestream.com")
    ) {
      const uid = parsed.pathname.split("/").filter(Boolean)[0];
      if (uid) return `https://videodelivery.net/${uid}/manifest/video.m3u8`;
    }
    if (parsed.pathname.endsWith(".m3u8")) return legacy;
  } catch {
    return undefined;
  }
  return undefined;
};

export function MobileMomentPlayer({
  accessibilityLabel = "Moment video",
  active = true,
  autoPlay = false,
  controls = true,
  loop = false,
  muted = true,
  playback,
  playbackUrl,
}: {
  accessibilityLabel?: string;
  active?: boolean;
  autoPlay?: boolean;
  controls?: boolean;
  loop?: boolean;
  muted?: boolean;
  playback?: MomentPlayback | null;
  playbackUrl?: string | null;
}) {
  const source = useMemo(
    () => momentHlsUrl({ playback, playbackUrl }),
    [playback, playbackUrl],
  );
  const [appActive, setAppActive] = useState(
    AppState.currentState === "active",
  );
  const player = useVideoPlayer(source ?? null, (instance) => {
    instance.loop = loop;
    instance.muted = muted;
  });

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      setAppActive(state === "active");
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    player.loop = loop;
    player.muted = muted;
    if (autoPlay && active && appActive) {
      player.play();
    } else {
      player.pause();
    }
  }, [active, appActive, autoPlay, loop, muted, player]);

  if (!source) {
    return (
      <View className="aspect-[4/5] items-center justify-center bg-secondary px-4">
        <Text className="text-center text-sm text-muted-foreground">
          This Moment is unavailable.
        </Text>
      </View>
    );
  }

  return (
    <VideoView
      accessibilityLabel={accessibilityLabel}
      contentFit="cover"
      nativeControls={controls}
      player={player}
      style={styles.video}
      surfaceType="textureView"
    />
  );
}

const styles = StyleSheet.create({
  video: {
    aspectRatio: 4 / 5,
    backgroundColor: "#0f172a",
    width: "100%",
  },
});
