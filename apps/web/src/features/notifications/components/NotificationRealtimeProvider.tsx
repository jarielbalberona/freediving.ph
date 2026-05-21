"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type {
  MessagingRealtimeEnvelope,
  MessagingUnreadCountResponse,
  Notification,
  NotificationRealtimeEnvelope,
  NotificationStats,
} from "@freediving.ph/types";
import { toast } from "sonner";

import { useSession } from "@/features/auth/session";
import { getFphgoBaseUrlClient } from "@/lib/api/fphgo-base-url";
import { getAuthToken } from "@/lib/api/fphgo-fetch-client";
import { queryKeys } from "@/lib/query/query-keys";
import { messageQueryKeys } from "@/features/messages/hooks/queries";

const DEDUP_SET_SIZE = 300;
const INITIAL_RECONNECT_DELAY_MS = 500;
const MAX_RECONNECT_DELAY_MS = 20000;

type RealtimeEnvelope =
  | NotificationRealtimeEnvelope<Notification>
  | MessagingRealtimeEnvelope<Record<string, unknown>>;

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

const rememberEvent = (seen: Set<string>, eventId?: string) => {
  if (!eventId) return false;
  if (seen.has(eventId)) return true;
  seen.add(eventId);
  if (seen.size > DEDUP_SET_SIZE) {
    const entries = Array.from(seen);
    for (let i = 0; i < entries.length - DEDUP_SET_SIZE; i++) {
      seen.delete(entries[i]);
    }
  }
  return false;
};

const isAppRelativeUrl = (value?: string) =>
  Boolean(value && value.startsWith("/") && !value.startsWith("//"));

export function NotificationRealtimeProvider() {
  const session = useSession();
  const queryClient = useQueryClient();
  const seenEventsRef = useRef<Set<string>>(new Set());
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const stoppedRef = useRef(false);
  const currentUserId = session.me?.userId;
  const enabled = session.status === "signed_in" && Boolean(currentUserId);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!enabled) return;

    stoppedRef.current = false;

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const scheduleReconnect = () => {
      if (stoppedRef.current) return;
      clearReconnectTimer();
      const attempts = reconnectAttemptsRef.current;
      const backoff = Math.min(
        INITIAL_RECONNECT_DELAY_MS * 2 ** attempts,
        MAX_RECONNECT_DELAY_MS,
      );
      const jitter = Math.floor(Math.random() * 300);
      reconnectTimerRef.current = window.setTimeout(() => {
        connect();
      }, backoff + jitter);
      reconnectAttemptsRef.current += 1;
    };

    const handleNotificationCreated = (notification: Notification) => {
      queryClient.setQueryData<NotificationStats>(
        queryKeys.notifications.stats(),
        (current) => {
          if (!current) return current;
          return {
            ...current,
            total: current.total + 1,
            unread:
              notification.status === "UNREAD"
                ? current.unread + 1
                : current.unread,
          };
        },
      );
      queryClient.setQueryData<Notification[]>(
        queryKeys.notifications.list(),
        (current) => {
          if (!current) return current;
          if (current.some((item) => item.id === notification.id)) {
            return current;
          }
          return [notification, ...current];
        },
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.stats(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.lists(),
      });

      const toastOptions = {
        description: notification.message,
        action: isAppRelativeUrl(notification.actionUrl)
          ? {
              label: "Open",
              onClick: () => {
                window.location.assign(notification.actionUrl as string);
              },
            }
          : undefined,
      };
      toast.info(notification.title, toastOptions);
    };

    const handleMessageCreated = (payload: Record<string, unknown>) => {
      const senderUserId = String(payload.senderUserId ?? "");
      if (senderUserId && senderUserId === currentUserId) return;
      queryClient.setQueryData<MessagingUnreadCountResponse>(
        messageQueryKeys.unreadCount(),
        (current) =>
          current
            ? { ...current, unreadCount: current.unreadCount + 1 }
            : current,
      );
      queryClient.invalidateQueries({
        queryKey: messageQueryKeys.unreadCount(),
      });
    };

    const handleThreadRead = (payload: Record<string, unknown>) => {
      const readerUserId = String(payload.readerUserId ?? "");
      if (readerUserId && readerUserId === currentUserId) {
        queryClient.invalidateQueries({
          queryKey: messageQueryKeys.unreadCount(),
        });
      }
    };

    const connect = async () => {
      if (stoppedRef.current) return;
      if (
        socketRef.current &&
        (socketRef.current.readyState === WebSocket.OPEN ||
          socketRef.current.readyState === WebSocket.CONNECTING)
      ) {
        return;
      }
      clearReconnectTimer();
      try {
        const socket = new WebSocket(await toWSUrl());
        socketRef.current = socket;

        socket.onopen = () => {
          reconnectAttemptsRef.current = 0;
          queryClient.invalidateQueries({
            queryKey: queryKeys.notifications.stats(),
          });
          queryClient.invalidateQueries({
            queryKey: messageQueryKeys.unreadCount(),
          });
        };

        socket.onmessage = (event) => {
          let parsed: RealtimeEnvelope | null = null;
          try {
            parsed = JSON.parse(event.data);
          } catch {
            return;
          }
          if (!parsed || parsed.v !== 1) return;
          if (rememberEvent(seenEventsRef.current, parsed.eventId)) return;

          if (parsed.type === "notification.created") {
            handleNotificationCreated(parsed.payload);
            return;
          }

          if (parsed.type === "message.created") {
            handleMessageCreated(parsed.payload);
            return;
          }

          if (parsed.type === "thread.read") {
            handleThreadRead(parsed.payload);
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

    connect();

    return () => {
      stoppedRef.current = true;
      clearReconnectTimer();
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [currentUserId, enabled, queryClient]);

  return null;
}
