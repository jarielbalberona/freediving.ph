import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Text, TextInput, View } from "react-native";

import {
  MobileEmptyState,
  MobileErrorState,
  MobileLoadingState,
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";
import {
  useMarkThreadReadMutation,
  useResolveMessageRequestMutation,
  useSendMessageMutation,
} from "@/features/messages/hooks/use-message-mutations";
import {
  useMessageThreadQuery,
  useThreadMessagesQuery,
} from "@/features/messages/hooks/use-message-queries";

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export function MessageThreadScreen() {
  const params = useLocalSearchParams<{ threadId?: string | string[] }>();
  const threadId = firstParam(params.threadId);
  const threadQuery = useMessageThreadQuery(threadId);
  const messagesQuery = useThreadMessagesQuery(threadId);
  const sendMutation = useSendMessageMutation(threadId ?? "");
  const resolveMutation = useResolveMessageRequestMutation(threadId ?? "");
  const markReadMutation = useMarkThreadReadMutation(threadId ?? "");
  const [draft, setDraft] = useState("");
  const [requestMessage, setRequestMessage] = useState<string | null>(null);
  const [sendErrorMessage, setSendErrorMessage] = useState<string | null>(null);
  const lastMarkedReadRef = useRef<string | null>(null);
  const messages = useMemo(
    () =>
      [...(messagesQuery.data?.items ?? [])].sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt),
      ),
    [messagesQuery.data?.items],
  );
  const thread = threadQuery.data;
  const lastMessageId = messages.at(-1)?.id;
  const markRead = markReadMutation.mutate;

  useEffect(() => {
    if (!threadId || !lastMessageId || markReadMutation.isPending) return;
    if (thread?.lastReadMessageId === lastMessageId) return;

    const markReadKey = `${threadId}:${lastMessageId}`;
    if (lastMarkedReadRef.current === markReadKey) return;

    lastMarkedReadRef.current = markReadKey;
    markRead(lastMessageId);
  }, [
    threadId,
    lastMessageId,
    markRead,
    markReadMutation.isPending,
    thread?.lastReadMessageId,
  ]);

  if (!threadId) {
    return (
      <MobileScrollScreen subtitle="Conversation" title="Messages">
        <MobileEmptyState
          description="Choose a conversation from Messages."
          title="Conversation not found"
        />
      </MobileScrollScreen>
    );
  }

  if (threadQuery.isLoading || messagesQuery.isLoading) {
    return (
      <MobileScrollScreen subtitle="Conversation" title="Messages">
        <MobileLoadingState message="Loading conversation." />
      </MobileScrollScreen>
    );
  }

  if (threadQuery.error || messagesQuery.error) {
    return (
      <MobileScrollScreen subtitle="Conversation" title="Messages">
        <MobileErrorState
          message="This conversation is taking longer than expected to load."
          title="Conversation unavailable"
        />
        <View className="mt-3">
          <MobileButton
            variant="secondary"
            onPress={() => {
              void threadQuery.refetch();
              void messagesQuery.refetch();
            }}
          >
            Try again
          </MobileButton>
        </View>
      </MobileScrollScreen>
    );
  }

  const participant = thread?.participants[0];
  const title = participant?.displayName || participant?.username || "Conversation";
  const canSend = Boolean(thread?.canSend);
  const canResolve = Boolean(thread?.canResolveRequest);

  return (
    <>
      <Stack.Screen options={{ title }} />
      <MobileScrollScreen subtitle="Conversation" title="Messages">
        {canResolve ? (
          <MobileSection
            description="Accept the request to continue the conversation, or decline it."
            title="Message request"
          >
            <View className="flex-row gap-2">
              <View className="flex-1">
                <MobileButton
                  disabled={resolveMutation.isPending}
                  onPress={() => {
                    setRequestMessage(null);
                    resolveMutation.mutate("accept", {
                      onError: () =>
                        setRequestMessage(
                          "Could not update this request. Try again.",
                        ),
                      onSuccess: () => setRequestMessage("Request accepted."),
                    });
                  }}
                >
                  Accept
                </MobileButton>
              </View>
              <View className="flex-1">
                <MobileButton
                  disabled={resolveMutation.isPending}
                  variant="danger"
                  onPress={() => {
                    setRequestMessage(null);
                    resolveMutation.mutate("decline", {
                      onError: () =>
                        setRequestMessage(
                          "Could not update this request. Try again.",
                        ),
                      onSuccess: () => setRequestMessage("Request declined."),
                    });
                  }}
                >
                  Decline
                </MobileButton>
              </View>
            </View>
            {requestMessage ? (
              <Text className="text-sm text-muted-foreground">{requestMessage}</Text>
            ) : null}
          </MobileSection>
        ) : null}

        <MobileSection title={title}>
          <View className="gap-3">
            {messages.length === 0 ? (
              <MobileEmptyState
                description="No messages have been sent yet."
                title="No messages"
              />
            ) : null}
            {messages.map((message) => (
              <View
                key={message.id}
                className={`max-w-[86%] rounded-2xl p-3 ${
                  message.isOwn ? "self-end bg-primary" : "self-start bg-card"
                }`}
              >
                <Text
                  className={`text-sm leading-6 ${
                    message.isOwn ? "text-primary-foreground" : "text-foreground"
                  }`}
                >
                  {message.body}
                </Text>
              </View>
            ))}
          </View>
        </MobileSection>

        <MobileSection title="Reply">
          <View className="gap-3">
            <TextInput
              className="min-h-24 rounded-2xl border border-border bg-card p-3 text-foreground"
              editable={canSend && !sendMutation.isPending}
              multiline
              onChangeText={setDraft}
              placeholder={
                canSend ? "Write a message" : "You cannot reply to this request yet."
              }
              placeholderTextColor="#64748b"
              value={draft}
            />
            <MobileButton
              disabled={!canSend || sendMutation.isPending || draft.trim().length === 0}
              onPress={() => {
                const body = draft.trim();
                if (!body) return;
                setSendErrorMessage(null);
                sendMutation.mutate(body, {
                  onError: () =>
                    setSendErrorMessage("Could not send message. Try again."),
                  onSuccess: () => setDraft(""),
                });
              }}
            >
              Send
            </MobileButton>
            {sendErrorMessage ? (
              <Text className="text-sm text-muted-foreground">{sendErrorMessage}</Text>
            ) : null}
          </View>
        </MobileSection>
      </MobileScrollScreen>
    </>
  );
}
