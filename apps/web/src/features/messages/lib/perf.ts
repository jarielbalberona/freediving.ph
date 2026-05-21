const STORAGE_PREFIX = "fph.messages.perf.";

const isMessagingPerfEnabled = () => process.env.NODE_ENV === "development";

export const currentMessagePerfTime = () =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

export const logMessagingPerf = (
  event: string,
  details: Record<string, unknown> = {},
) => {
  if (!isMessagingPerfEnabled() || typeof console === "undefined") return;
  console.debug("[messages-perf]", event, details);
};

export const markThreadOpenStart = (
  threadId: string,
  source: string,
  startedAt = currentMessagePerfTime(),
) => {
  if (!isMessagingPerfEnabled() || !threadId) return;
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(
        `${STORAGE_PREFIX}${threadId}.openStart`,
        String(startedAt),
      );
    } catch {
      // Best-effort timing only.
    }
  }
  logMessagingPerf("room_open_click", { source, threadId });
};

export const getThreadOpenDelta = (threadId: string) => {
  if (!isMessagingPerfEnabled() || !threadId || typeof window === "undefined") {
    return undefined;
  }
  try {
    const raw = window.sessionStorage.getItem(
      `${STORAGE_PREFIX}${threadId}.openStart`,
    );
    if (!raw) return undefined;
    const startedAt = Number(raw);
    if (!Number.isFinite(startedAt)) return undefined;
    return Math.round(currentMessagePerfTime() - startedAt);
  } catch {
    return undefined;
  }
};
