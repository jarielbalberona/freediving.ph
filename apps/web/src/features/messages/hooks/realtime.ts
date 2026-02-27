import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import type {
  ConversationListItem,
  ConversationListResponse,
  ConversationMessagesResponse,
  MessageCreatedPayload,
  MessageItem,
  MessageWebSocketEnvelope,
} from "@freediving.ph/types";
import { getFphgoBaseUrlClient } from "@/lib/api/fphgo-base-url";

const DEDUP_SET_SIZE = 200;

const toWSUrl = (baseUrl: string) => {
  const url = new URL(baseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws";
  url.search = "";
  return url.toString();
};

export const useMessagesRealtime = (currentUserId?: string) => {
  const queryClient = useQueryClient();
  const seenEventsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined") return;

    const socket = new WebSocket(toWSUrl(getFphgoBaseUrlClient()));

    socket.onmessage = (event) => {
      let parsed: MessageWebSocketEnvelope<Record<string, unknown>> | null = null;
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
        const payload = parsed.payload as unknown as MessageCreatedPayload;
        const convId = payload.conversationId;
        if (!convId) return;

        if (payload.content && payload.messageId) {
          const newMsg: MessageItem = {
            conversationId: convId,
            messageId: payload.messageId,
            senderId: payload.senderId,
            content: payload.content,
            createdAt: payload.createdAt,
          };

          queryClient.setQueryData<ConversationMessagesResponse | undefined>(
            ["messages", "conversation", convId],
            (current) => {
              if (!current) return current;
              const exists = current.items.some((m) => m.messageId === newMsg.messageId);
              if (exists) return current;
              return { ...current, items: [newMsg, ...current.items] };
            },
          );
        }

        queryClient.setQueryData<ConversationListResponse | undefined>(
          ["messages", "inbox"],
          (current) => {
            if (!current) return current;
            const idx = current.items.findIndex((item) => item.conversationId === convId);
            if (idx === -1) {
              queryClient.invalidateQueries({ queryKey: ["messages", "inbox"] });
              return current;
            }
            const items = [...current.items];
            const updated: ConversationListItem = {
              ...items[idx],
              updatedAt: payload.createdAt || new Date().toISOString(),
              lastMessage: payload.content
                ? {
                    conversationId: convId,
                    messageId: payload.messageId,
                    senderId: payload.senderId,
                    content: payload.content,
                    createdAt: payload.createdAt,
                  }
                : items[idx].lastMessage,
            };
            if (currentUserId && payload.senderId !== currentUserId) {
              updated.unreadCount = (updated.unreadCount ?? 0) + 1;
            }
            items.splice(idx, 1);
            items.unshift(updated);
            return { ...current, items };
          },
        );
        return;
      }

      if (
        parsed.type === "conversation.updated" ||
        parsed.type === "request.created" ||
        parsed.type === "request.accepted" ||
        parsed.type === "request.declined"
      ) {
        const convId = String(parsed.payload?.conversationId ?? "");
        if (!convId) return;

        queryClient.setQueryData<ConversationListResponse | undefined>(
          ["messages", "inbox"],
          (current) => {
            if (!current) return current;
            const idx = current.items.findIndex((item) => item.conversationId === convId);
            if (idx === -1) {
              queryClient.invalidateQueries({ queryKey: ["messages", "inbox"] });
              return current;
            }
            const items = [...current.items];
            const nextStatus = String(parsed?.payload?.status ?? items[idx].status) as ConversationListItem["status"];
            items[idx] = { ...items[idx], status: nextStatus };
            return { ...current, items };
          },
        );
      }
    };

    return () => {
      socket.close();
    };
  }, [queryClient, currentUserId]);
};
