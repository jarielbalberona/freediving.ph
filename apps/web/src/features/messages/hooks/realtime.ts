import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type {
  MessagingRealtimeEnvelope,
  MessagingThreadMessage,
  MessagingThreadMessagesResponse,
  MessagingThreadSummary,
} from "@freediving.ph/types";
import { toast } from "sonner";

import { getFphgoBaseUrlClient } from "@/lib/api/fphgo-base-url";
import { getAuthToken } from "@/lib/api/fphgo-fetch-client";
import { messageQueryKeys } from "./queries";

const DEDUP_SET_SIZE = 300;
const INITIAL_RECONNECT_DELAY_MS = 500;
const MAX_RECONNECT_DELAY_MS = 20000;

const toWSUrl = async (baseUrl: string) => {
  const url = new URL(baseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws";
  url.search = "";
  const token = await getAuthToken();
  if (token) {
    url.searchParams.set("access_token", token);
  }
  return url.toString();
};

export const useMessagesRealtime = (params: {
  currentUserId?: string;
  activeThreadId?: string | null;
  enabled?: boolean;
}) => {
  const queryClient = useQueryClient();
  const seenEventsRef = useRef<Set<string>>(new Set());
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const stoppedRef = useRef<boolean>(false);
  const [networkOnline, setNetworkOnline] = useState<boolean>(typeof navigator === "undefined" ? true : navigator.onLine);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "reconnecting" | "disconnected">("disconnected");
  const [peerReadMessageByThread, setPeerReadMessageByThread] = useState<Record<string, string>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!params.enabled) return;

    stoppedRef.current = false;
    setConnectionStatus("connecting");

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const scheduleReconnect = () => {
      if (stoppedRef.current) return;
      clearReconnectTimer();
      setConnectionStatus("reconnecting");
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
        const socket = new WebSocket(await toWSUrl(getFphgoBaseUrlClient()));
        socketRef.current = socket;

        socket.onopen = () => {
          reconnectAttemptsRef.current = 0;
          setConnectionStatus("connected");
        };

        socket.onmessage = (event) => {
          let parsed: MessagingRealtimeEnvelope<Record<string, unknown>> | null = null;
          try {
            parsed = JSON.parse(event.data);
          } catch {
            return;
          }
          if (!parsed || parsed.v !== 1) return;

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

          if (parsed.type === "message.created") {
            const payload = parsed.payload;
            const threadId = String(payload.threadId ?? "");
            if (!threadId) return;

            const message: MessagingThreadMessage = {
              id: String(payload.id ?? ""),
              threadId,
              senderUserId: String(payload.senderUserId ?? ""),
              kind: String(payload.kind ?? "text") as MessagingThreadMessage["kind"],
              body: String(payload.body ?? ""),
              createdAt: String(payload.createdAt ?? new Date().toISOString()),
              clientId: typeof payload.clientId === "string" ? payload.clientId : undefined,
              isOwn: params.currentUserId ? String(payload.senderUserId ?? "") === params.currentUserId : false,
              status: "sent",
            };

            queryClient.setQueryData(messageQueryKeys.threadMessages(threadId), (current: { pages: MessagingThreadMessagesResponse[]; pageParams: string[] } | undefined) => {
              if (!current) return current;
              const [firstPage, ...rest] = current.pages;
              if (!firstPage) return current;
              const exists = firstPage.items.some((item) => item.id === message.id || (message.clientId && item.clientId === message.clientId));
              if (exists) return current;
              return {
                ...current,
                pages: [{ ...firstPage, items: [...firstPage.items, message] }, ...rest],
              };
            });

            let foundThread = false;
            queryClient.setQueriesData({ queryKey: ["messages", "threads"] }, (current: { pages: { items: MessagingThreadSummary[] }[] } | undefined) => {
              if (!current) return current;
              const pages = current.pages.map((page) => ({
                ...page,
                items: page.items.map((item) => {
                  if (item.id !== threadId) return item;
                  foundThread = true;
                  const incoming = params.currentUserId && message.senderUserId !== params.currentUserId;
                  const active = params.activeThreadId === threadId;
                  return {
                    ...item,
                    lastMessage: message,
                    lastMessageAt: message.createdAt,
                    unreadCount: incoming && !active ? item.unreadCount + 1 : item.unreadCount,
                    hasUnread: incoming && !active ? true : item.hasUnread,
                  };
                }),
              }));
              return { ...current, pages };
            });
            if (!foundThread) {
              queryClient.invalidateQueries({ queryKey: ["messages", "threads"] });
            }

            const incoming = params.currentUserId && message.senderUserId !== params.currentUserId;
            const active = params.activeThreadId === threadId;
            if (incoming) {
              queryClient.invalidateQueries({ queryKey: ["notification-stats"] });
              queryClient.invalidateQueries({ queryKey: ["notifications"] });
              if (!active) {
                const preview = message.body.length > 80 ? `${message.body.slice(0, 80)}...` : message.body;
                toast.info("New message", { description: preview || "You received a new message." });
              }
            }
          }

          if (parsed.type === "thread.updated") {
            const threadId = String(parsed.payload.threadId ?? "");
            queryClient.invalidateQueries({ queryKey: ["messages", "threads"] });
            if (threadId) {
              queryClient.invalidateQueries({ queryKey: messageQueryKeys.thread(threadId) });
            }
          }

          if (parsed.type === "thread.read") {
            const threadId = String(parsed.payload.threadId ?? "");
            const readerUserId = String(parsed.payload.readerUserId ?? "");
            const lastReadMessageId = String(parsed.payload.lastReadMessageId ?? "");
            if (!threadId || !readerUserId) return;
            if (params.currentUserId && readerUserId !== params.currentUserId && lastReadMessageId) {
              setPeerReadMessageByThread((current) => ({
                ...current,
                [threadId]: lastReadMessageId,
              }));
            }

            queryClient.invalidateQueries({ queryKey: ["messages", "threads"] });
            queryClient.invalidateQueries({ queryKey: messageQueryKeys.thread(threadId) });
          }
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

    const handleOnline = () => setNetworkOnline(true);
    const handleOffline = () => setNetworkOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    connect();

    return () => {
      stoppedRef.current = true;
      clearReconnectTimer();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      setConnectionStatus("disconnected");
    };
  }, [queryClient, params.activeThreadId, params.currentUserId, params.enabled]);

  return {
    networkOnline,
    connectionStatus,
    peerReadMessageByThread,
  };
};
