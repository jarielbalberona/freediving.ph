"use client";

import { useEffect, useMemo, useState } from "react";

import { AuthGuard } from "@/components/auth/guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  useAcceptMessageRequest,
  useConversationMessages,
  useCreateMessageRequest,
  useDeclineMessageRequest,
  useMarkConversationRead,
  useMessageInbox,
  useMessagesRealtime,
  useSendMessage,
} from "@/features/messages";
import { getApiErrorMessage } from "@/lib/http/api-error";

export default function MessagesPage() {
  useMessagesRealtime();

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [recipientId, setRecipientId] = useState("");
  const [composer, setComposer] = useState("");

  const inbox = useMessageInbox();
  const messages = useConversationMessages(selectedConversationId);

  const createRequest = useCreateMessageRequest();
  const acceptRequest = useAcceptMessageRequest();
  const declineRequest = useDeclineMessageRequest();
  const sendMessage = useSendMessage();
  const markRead = useMarkConversationRead();

  const items = inbox.data?.items ?? [];
  const pending = useMemo(() => items.filter((item) => item.status === "pending"), [items]);
  const active = useMemo(() => items.filter((item) => item.status === "active"), [items]);
  const declined = useMemo(() => items.filter((item) => item.status === "rejected"), [items]);
  const selectedConversation = items.find((item) => item.conversationId === selectedConversationId) ?? null;

  useEffect(() => {
    if (!selectedConversationId && items.length > 0) {
      setSelectedConversationId(items[0].conversationId);
    }
  }, [items, selectedConversationId]);

  const totalUnread = useMemo(() => items.reduce((sum, item) => sum + (item.unreadCount ?? 0), 0), [items]);

  return (
    <AuthGuard title="Sign in to access messages" description="Direct messages are available to authenticated members only.">
      <div className="container mx-auto space-y-6 p-6">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Messages</h1>
          {totalUnread > 0 ? <Badge variant="destructive">{totalUnread} unread</Badge> : null}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Start Request</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Recipient user ID (UUID)" value={recipientId} onChange={(e) => setRecipientId(e.target.value)} />
            <Input placeholder="First message" value={composer} onChange={(e) => setComposer(e.target.value)} />
            <Button
              disabled={!recipientId.trim() || !composer.trim() || createRequest.isPending}
              onClick={() => createRequest.mutate({ recipientId: recipientId.trim(), content: composer.trim() })}
            >
              Send Request
            </Button>
            {createRequest.error ? <p className="text-sm text-destructive">{getApiErrorMessage(createRequest.error, "Failed to create request")}</p> : null}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Pending Requests
                {pending.length > 0 ? <Badge variant="secondary">{pending.length}</Badge> : null}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {inbox.error ? <p className="text-sm text-destructive">{getApiErrorMessage(inbox.error, "Failed to load inbox")}</p> : null}
              {pending.length === 0 ? <p className="text-sm text-muted-foreground">No pending requests.</p> : null}
              {pending.map((item) => (
                <div key={item.conversationId} className="rounded-md border p-3 space-y-2">
                  <p className="font-medium">{item.participant.displayName || item.participant.username}</p>
                  <p className="text-xs text-muted-foreground">{item.participant.userId}</p>
                  {item.requestPreview ? <p className="text-sm italic">&ldquo;{item.requestPreview.content}&rdquo;</p> : null}
                  {item.pendingCount > 1 ? (
                    <p className="text-xs text-muted-foreground">{item.pendingCount} messages queued</p>
                  ) : null}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => acceptRequest.mutate(item.conversationId)}>Accept</Button>
                    <Button size="sm" variant="outline" onClick={() => declineRequest.mutate(item.conversationId)}>Decline</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Conversations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {active.length === 0 ? <p className="text-sm text-muted-foreground">No active conversations.</p> : null}
              {active.map((item) => (
                <button
                  type="button"
                  key={item.conversationId}
                  className={`w-full rounded-md border p-3 text-left transition-colors ${
                    item.conversationId === selectedConversationId ? "border-primary bg-accent" : ""
                  }`}
                  onClick={() => {
                    setSelectedConversationId(item.conversationId);
                    markRead.mutate({ conversationId: item.conversationId, messageId: item.lastMessage?.messageId });
                  }}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{item.participant.displayName || item.participant.username}</p>
                    {item.unreadCount > 0 ? <Badge variant="destructive" className="text-xs">{item.unreadCount}</Badge> : null}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{item.lastMessage?.content}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Declined</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {declined.length === 0 ? <p className="text-sm text-muted-foreground">No declined requests.</p> : null}
              {declined.map((item) => (
                <div key={item.conversationId} className="rounded-md border border-dashed p-3 opacity-60">
                  <p className="font-medium">{item.participant.displayName || item.participant.username}</p>
                  <p className="text-xs text-muted-foreground">Request declined</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {selectedConversation
                ? `Conversation with ${selectedConversation.participant.displayName || selectedConversation.participant.username}`
                : "Select a conversation"}
            </CardTitle>
            {selectedConversation?.status === "pending" ? (
              <p className="text-sm text-muted-foreground">This conversation is pending acceptance.</p>
            ) : null}
            {selectedConversation?.status === "rejected" ? (
              <p className="text-sm text-destructive">This request was declined. You cannot send more messages.</p>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedConversationId ? (
              <>
                <div className="max-h-[420px] space-y-2 overflow-y-auto rounded-md border p-3">
                  {(messages.data?.items ?? []).map((message) => (
                    <div key={message.messageId} className="rounded-md bg-muted p-2 text-sm">
                      <p>{message.content}</p>
                      <p className="text-[11px] text-muted-foreground">{message.createdAt}</p>
                    </div>
                  ))}
                </div>
                {selectedConversation?.status !== "rejected" ? (
                  <div className="flex gap-2">
                    <Input value={composer} onChange={(e) => setComposer(e.target.value)} placeholder="Type a message" />
                    <Button
                      disabled={!composer.trim() || sendMessage.isPending}
                      onClick={() => {
                        if (!selectedConversationId) return;
                        sendMessage.mutate(
                          { conversationId: selectedConversationId, content: composer.trim() },
                          { onSuccess: () => setComposer("") },
                        );
                      }}
                    >
                      Send
                    </Button>
                  </div>
                ) : null}
                {sendMessage.error ? (
                  <p className="text-sm text-destructive">{getApiErrorMessage(sendMessage.error, "Failed to send message")}</p>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Pick a conversation from Active Conversations.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
}
