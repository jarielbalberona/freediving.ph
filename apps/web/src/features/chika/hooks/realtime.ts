import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ChikaCommentResponse, ChikaThreadResponse } from "@freediving.ph/types";
import { toast } from "sonner";

import { getFphgoBaseUrlClient } from "@/lib/api/fphgo-base-url";
import { getAuthToken } from "@/lib/api/fphgo-fetch-client";

const DEDUP_SET_SIZE = 300;
const INITIAL_RECONNECT_DELAY_MS = 500;
const MAX_RECONNECT_DELAY_MS = 20000;

type RealtimeEnvelope = {
  v: number;
  type: string;
  eventId?: string;
  payload?: Record<string, unknown>;
};

const toWSUrl = async () => {
  const url = new URL(getFphgoBaseUrlClient());
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws";
  url.search = "";
  const token = await getAuthToken();
  if (token) {
    url.searchParams.set("access_token", token);
  }
  return url.toString();
};

export const useChikaRealtime = (params: { enabled?: boolean; threadId?: string; currentUserId?: string }) => {
  const queryClient = useQueryClient();
  const seenEventsRef = useRef<Set<string>>(new Set());
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const stoppedRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!params.enabled) return;

    stoppedRef.current = false;

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const invalidateThread = (threadId: string) => {
      queryClient.invalidateQueries({ queryKey: ["chika", "threads"] });
      queryClient.invalidateQueries({ queryKey: ["chika", "threads", threadId] });
      queryClient.invalidateQueries({ queryKey: ["chika", "threads", threadId, "comments"] });
    };

    const updateThreadVoteCount = (threadId: string, voteCount: number) => {
      queryClient.setQueriesData({ queryKey: ["chika", "threads"] }, (current: ChikaThreadResponse[] | undefined) => {
        if (!Array.isArray(current)) return current;
        return current.map((thread) => (thread.id === threadId ? { ...thread, voteCount } : thread));
      });
      queryClient.setQueryData(["chika", "threads", threadId], (current: ChikaThreadResponse | undefined) => {
        if (!current) return current;
        return { ...current, voteCount };
      });
    };

    const updateCommentVoteCount = (threadId: string, commentId: string, voteCount: number) => {
      queryClient.setQueryData(["chika", "threads", threadId, "comments"], (current: ChikaCommentResponse[] | undefined) => {
        if (!Array.isArray(current)) return current;
        return current.map((comment) => (comment.id === commentId ? { ...comment, voteCount } : comment));
      });
    };

    const scheduleReconnect = () => {
      if (stoppedRef.current) return;
      clearReconnectTimer();
      const attempts = reconnectAttemptsRef.current;
      const backoff = Math.min(INITIAL_RECONNECT_DELAY_MS * 2 ** attempts, MAX_RECONNECT_DELAY_MS);
      const jitter = Math.floor(Math.random() * 300);
      reconnectTimerRef.current = window.setTimeout(() => {
        connect();
      }, backoff + jitter);
      reconnectAttemptsRef.current += 1;
    };

    const connect = async () => {
      if (stoppedRef.current) return;
      clearReconnectTimer();
      try {
        const socket = new WebSocket(await toWSUrl());
        socketRef.current = socket;

        socket.onopen = () => {
          reconnectAttemptsRef.current = 0;
        };

        socket.onmessage = (event) => {
          let parsed: RealtimeEnvelope | null = null;
          try {
            parsed = JSON.parse(event.data);
          } catch {
            return;
          }
          if (!parsed || parsed.v !== 1 || !parsed.type.startsWith("chika.")) return;

          if (parsed.eventId) {
            const seen = seenEventsRef.current;
            if (seen.has(parsed.eventId)) return;
            seen.add(parsed.eventId);
            if (seen.size > DEDUP_SET_SIZE) {
              const entries = Array.from(seen);
              for (let i = 0; i < entries.length - DEDUP_SET_SIZE; i++) {
                seen.delete(entries[i]);
              }
            }
          }

          const payload = parsed.payload ?? {};
          const threadId = String(payload.threadId ?? "");
          const voteCountRaw = payload.voteCount;
          const voteCount = typeof voteCountRaw === "number" ? voteCountRaw : Number.NaN;
          const actorUserId = String(payload.actorUserId ?? "");
          const commentId = String(payload.commentId ?? "");
          const authorUserId = String(payload.authorUserId ?? "");

          if (parsed.type === "chika.thread.reaction.updated" && threadId && Number.isFinite(voteCount)) {
            updateThreadVoteCount(threadId, voteCount);
            if (params.currentUserId && actorUserId && actorUserId === params.currentUserId) {
              invalidateThread(threadId);
            }
            return;
          }

          if (parsed.type === "chika.comment.reaction.updated" && threadId && commentId && Number.isFinite(voteCount)) {
            updateCommentVoteCount(threadId, commentId, voteCount);
            if (params.currentUserId && actorUserId && actorUserId === params.currentUserId) {
              invalidateThread(threadId);
            }
            return;
          }

          if (parsed.type === "chika.comment.created" && threadId) {
            if (params.threadId && params.threadId === threadId && authorUserId && authorUserId !== params.currentUserId) {
              toast.info("New chika reply");
            }
            queryClient.invalidateQueries({ queryKey: ["notification-stats"] });
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
          }

          if (parsed.type === "chika.thread.created") {
            if (authorUserId && authorUserId !== params.currentUserId) {
              toast.info("New chika thread posted");
            }
            queryClient.invalidateQueries({ queryKey: ["notification-stats"] });
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
          }

          if (threadId) {
            invalidateThread(threadId);
            return;
          }

          if (params.threadId) {
            invalidateThread(params.threadId);
            return;
          }

          queryClient.invalidateQueries({ queryKey: ["chika", "threads"] });
        };

        socket.onclose = () => {
          if (socketRef.current === socket) {
            socketRef.current = null;
          }
          scheduleReconnect();
        };
        socket.onerror = () => {
          socket.close();
        };
      } catch {
        scheduleReconnect();
      }
    };

    connect();

    return () => {
      stoppedRef.current = true;
      clearReconnectTimer();
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [params.enabled, params.threadId, params.currentUserId, queryClient]);
};
