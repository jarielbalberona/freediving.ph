"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { MessageMetadata } from "@freediving.ph/types";

import { AuthGuard } from "@/components/auth/guard";
import { TrustCard } from "@/components/trust-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { exploreApi } from "@/features/diveSpots/api/explore-v1";
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
import { useSavedHub } from "@/features/profiles/hooks/queries";
import { getApiErrorMessage } from "@/lib/http/api-error";

export default function MessagesPage() {
  useMessagesRealtime();

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [recipientId, setRecipientId] = useState("");
  const [composer, setComposer] = useState("");
  const [attachSpot, setAttachSpot] = useState(false);
  const [attachedSiteId, setAttachedSiteId] = useState("");
  const [attachedTimeWindow, setAttachedTimeWindow] = useState<"today" | "weekend" | "specific_date">("weekend");
  const [attachedDateStart, setAttachedDateStart] = useState("");
  const [attachedDateEnd, setAttachedDateEnd] = useState("");
  const [attachedNote, setAttachedNote] = useState("");

  const inbox = useMessageInbox();
  const messages = useConversationMessages(selectedConversationId);
  const savedHub = useSavedHub(true);
  const recentSites = useQuery({
    queryKey: ["messages", "recent-sites"],
    queryFn: () => exploreApi.listSites({ limit: 8 }),
    staleTime: 60_000,
  });

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
  const siteOptions = useMemo(() => {
    const deduped = new Map<string, { id: string; slug?: string; name: string; area: string }>();
    for (const site of savedHub.data?.sites ?? []) {
      deduped.set(site.id, { id: site.id, slug: site.slug, name: site.name, area: site.area });
    }
    for (const site of recentSites.data?.items ?? []) {
      deduped.set(site.id, { id: site.id, slug: site.slug, name: site.name, area: site.area });
    }
    return Array.from(deduped.values());
  }, [recentSites.data?.items, savedHub.data?.sites]);

  useEffect(() => {
    if (!selectedConversationId && items.length > 0) {
      setSelectedConversationId(items[0].conversationId);
    }
  }, [items, selectedConversationId]);

  const totalUnread = useMemo(() => items.reduce((sum, item) => sum + (item.unreadCount ?? 0), 0), [items]);
  const attachedSite = siteOptions.find((site) => site.id === attachedSiteId);

  const composerMetadata: MessageMetadata | undefined = attachSpot && attachedSite
    ? {
        type: "meet_at",
        diveSiteId: attachedSite.id,
        diveSiteSlug: attachedSite.slug,
        diveSiteName: attachedSite.name,
        diveSiteArea: attachedSite.area,
        timeWindow: attachedTimeWindow,
        dateStart: attachedDateStart || undefined,
        dateEnd: attachedDateEnd || undefined,
        note: attachedNote || undefined,
      }
    : undefined;

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
                  <TrustCard
                    emailVerified={item.participant.trust.emailVerified}
                    phoneVerified={item.participant.trust.phoneVerified}
                    certLevel={item.participant.trust.certLevel}
                    buddyCount={item.participant.trust.buddyCount}
                    reportCount={item.participant.trust.reportCount}
                  />
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
                <Button
                  type="button"
                  variant="ghost"
                  key={item.conversationId}
                  className={`w-full rounded-md border p-3 text-left transition-colors h-auto ${
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
                  <div className="mt-2">
                    <TrustCard
                      emailVerified={item.participant.trust.emailVerified}
                      phoneVerified={item.participant.trust.phoneVerified}
                      certLevel={item.participant.trust.certLevel}
                      buddyCount={item.participant.trust.buddyCount}
                      reportCount={item.participant.trust.reportCount}
                    />
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{item.lastMessage?.content}</p>
                </Button>
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
            {selectedConversation ? (
              <TrustCard
                emailVerified={selectedConversation.participant.trust.emailVerified}
                phoneVerified={selectedConversation.participant.trust.phoneVerified}
                certLevel={selectedConversation.participant.trust.certLevel}
                buddyCount={selectedConversation.participant.trust.buddyCount}
                reportCount={selectedConversation.participant.trust.reportCount}
              />
            ) : null}
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
                      {message.metadata?.type === "meet_at" ? (
                        <div className="mb-2 rounded-md border bg-background p-3">
                          <p className="font-medium">Meet at {message.metadata.diveSiteName}</p>
                          <p className="text-xs text-muted-foreground">{message.metadata.diveSiteArea}</p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {message.metadata.timeWindow ? <span>{message.metadata.timeWindow.replace("_", " ")}</span> : null}
                            {message.metadata.dateStart ? <span>From {message.metadata.dateStart}</span> : null}
                            {message.metadata.dateEnd ? <span>To {message.metadata.dateEnd}</span> : null}
                          </div>
                          {message.metadata.note ? <p className="mt-2 text-sm">{message.metadata.note}</p> : null}
                          {message.metadata.diveSiteSlug ? (
                            <a
                              className="mt-2 inline-block text-xs font-medium text-primary"
                              href={`/explore/sites/${message.metadata.diveSiteSlug}`}
                            >
                              Open site
                            </a>
                          ) : null}
                        </div>
                      ) : null}
                      <p>{message.content}</p>
                      <p className="text-[11px] text-muted-foreground">{message.createdAt}</p>
                    </div>
                  ))}
                </div>
                {selectedConversation?.status !== "rejected" ? (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input value={composer} onChange={(e) => setComposer(e.target.value)} placeholder="Type a message" />
                      <Button type="button" variant="outline" onClick={() => setAttachSpot((current) => !current)}>
                        {attachSpot ? "Remove spot" : "Attach spot"}
                      </Button>
                      <Button
                        disabled={!composer.trim() || sendMessage.isPending}
                        onClick={() => {
                          if (!selectedConversationId) return;
                          sendMessage.mutate(
                            { conversationId: selectedConversationId, content: composer.trim(), metadata: composerMetadata },
                            {
                              onSuccess: () => {
                                setComposer("");
                                setAttachSpot(false);
                                setAttachedSiteId("");
                                setAttachedDateStart("");
                                setAttachedDateEnd("");
                                setAttachedNote("");
                              },
                            },
                          );
                        }}
                      >
                        Send
                      </Button>
                    </div>
                    {attachSpot ? (
                      <div className="rounded-md border p-3 space-y-3">
                        <div className="space-y-2">
                          <Label>Saved or recent spot</Label>
                          <Select value={attachedSiteId || "none"} onValueChange={(value) => setAttachedSiteId(!value || value === "none" ? "" : value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Pick a site" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No site selected</SelectItem>
                              {siteOptions.map((site) => (
                                <SelectItem key={site.id} value={site.id}>
                                  {site.name} · {site.area}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="space-y-2">
                            <Label>Time window</Label>
                            <Select value={attachedTimeWindow} onValueChange={(value) => setAttachedTimeWindow(value as typeof attachedTimeWindow)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="weekend">Weekend</SelectItem>
                                <SelectItem value="specific_date">Specific date</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Date start</Label>
                            <Input type="date" value={attachedDateStart} onChange={(e) => setAttachedDateStart(e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label>Date end</Label>
                            <Input type="date" value={attachedDateEnd} onChange={(e) => setAttachedDateEnd(e.target.value)} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Plan note</Label>
                          <Textarea value={attachedNote} onChange={(e) => setAttachedNote(e.target.value)} placeholder="What kind of session are you proposing?" />
                        </div>
                      </div>
                    ) : null}
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
