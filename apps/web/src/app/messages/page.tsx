"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { AxiosError } from "axios";
import { MessageCircleMore, Send } from "lucide-react";

import type { MessageConversationParticipant } from "@freediving.ph/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ReportAction } from "@/components/report/report-action";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useConversationMessages,
  useDeleteOwnMessage,
  useMessageConversations,
  useSendMessage,
} from "@/features/messages";

const formatMessageTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
};

const getParticipantName = (participant: MessageConversationParticipant | undefined) => {
  if (!participant) return "Unknown diver";
  return participant.alias || participant.username || `Diver #${participant.id}`;
};

export default function MessagesPage() {
  const { user, isLoaded } = useUser();
  const numericUserId = Number.parseInt(user?.id ?? "", 10);
  const hasNumericUserId = Number.isInteger(numericUserId);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [composerValue, setComposerValue] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);

  const { data: conversations = [], isLoading: isConversationsLoading } = useMessageConversations();
  const { data: messages = [], isLoading: isMessagesLoading } = useConversationMessages(selectedConversationId, {
    limit: 50,
    offset: 0,
  });
  const sendMessageMutation = useSendMessage();
  const deleteOwnMessageMutation = useDeleteOwnMessage();

  useEffect(() => {
    if (!selectedConversationId && conversations.length > 0) {
      setSelectedConversationId(conversations[0].conversationId);
    }
  }, [conversations, selectedConversationId]);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.conversationId === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );

  const handleSendMessage = () => {
    if (!selectedConversationId || !composerValue.trim()) return;
    setSendError(null);

    sendMessageMutation.mutate(
      {
        conversationId: selectedConversationId,
        payload: {
          content: composerValue.trim(),
        },
      },
      {
        onSuccess: () => {
          setComposerValue("");
        },
        onError: (error) => {
          if (error instanceof AxiosError) {
            setSendError(error.response?.data?.message || "Failed to send message");
            return;
          }
          setSendError("Failed to send message");
        },
      },
    );
  };

  if (!isLoaded) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-[520px] w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <MessageCircleMore className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="text-2xl font-semibold">Sign in to access messages</h2>
            <p className="text-muted-foreground">Direct conversations are available to authenticated members only.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Messages</h1>
          <p className="text-muted-foreground">Secure direct conversations with your buddies and community contacts.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Conversations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isConversationsLoading ? (
                <>
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </>
              ) : conversations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No conversations yet.</p>
              ) : (
                conversations.map((conversation) => {
                  const otherParticipant =
                    (hasNumericUserId
                      ? conversation.participants.find((participant) => participant.id !== numericUserId)
                      : null) ?? conversation.participants[0];
                  const isSelected = conversation.conversationId === selectedConversationId;

                  return (
                    <button
                      key={conversation.conversationId}
                      className={`w-full rounded-md border p-3 text-left transition-colors ${
                        isSelected ? "border-primary bg-primary/5" : "hover:bg-accent"
                      }`}
                      onClick={() => setSelectedConversationId(conversation.conversationId)}
                      type="button"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{getParticipantName(otherParticipant)}</span>
                        {conversation.unreadCount > 0 ? <Badge>{conversation.unreadCount}</Badge> : null}
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        {conversation.lastMessage?.content ?? "No messages yet"}
                      </p>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>{selectedConversation ? "Conversation" : "Select a conversation"}</CardTitle>
                {selectedConversation ? (
                  <ReportAction targetType="CONVERSATION" targetId={String(selectedConversation.conversationId)} />
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedConversation ? (
                <p className="text-sm text-muted-foreground">Choose a conversation from the left panel to start messaging.</p>
              ) : (
                <div className="space-y-4">
                  <div className="max-h-[420px] space-y-3 overflow-y-auto rounded-md border p-3">
                    {isMessagesLoading ? (
                      <>
                        <Skeleton className="h-14 w-3/4" />
                        <Skeleton className="h-14 w-2/3" />
                        <Skeleton className="h-14 w-3/4" />
                      </>
                    ) : messages.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No messages yet. Start the conversation below.</p>
                    ) : (
                      messages.map((message) => {
                        const isMine = hasNumericUserId ? message.senderId === numericUserId : false;
                        return (
                          <div
                            key={message.id}
                            className={`max-w-[85%] rounded-md px-3 py-2 text-sm ${
                              isMine ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"
                            }`}
                          >
                            <p>{message.content}</p>
                            <div className="mt-2 flex items-center gap-2">
                              {isMine ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  className="h-6 px-2 text-[11px]"
                                  onClick={() => {
                                    if (!selectedConversationId) return;
                                    deleteOwnMessageMutation.mutate({
                                      conversationId: selectedConversationId,
                                      messageId: message.id,
                                    });
                                  }}
                                >
                                  Delete
                                </Button>
                              ) : null}
                              <ReportAction
                                targetType="MESSAGE"
                                targetId={`${selectedConversation?.conversationId ?? "0"}:${message.id}`}
                              />
                            </div>
                            <p className={`mt-1 text-[11px] ${isMine ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                              {formatMessageTime(message.createdAt)}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Type a message"
                      value={composerValue}
                      onChange={(event) => setComposerValue(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <Button onClick={handleSendMessage} disabled={!composerValue.trim() || sendMessageMutation.isPending}>
                      <Send className="mr-2 h-4 w-4" />
                      Send
                    </Button>
                  </div>
                  {sendError ? <p className="text-sm text-destructive">{sendError}</p> : null}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
