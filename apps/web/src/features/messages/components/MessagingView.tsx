"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { MessagingThreadCategory, MessagingThreadMessage, MessagingThreadSummary } from "@freediving.ph/types";

import { AuthGuard } from "@/components/auth/guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/ui/user-avatar";
import { UserAvatarDetail } from "@/components/ui/user-avatar-detail";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSession } from "@/features/auth/session/use-session";

import { useMarkThreadRead, useResolveThreadRequest, useSendThreadMessage } from "../hooks/mutations";
import { useThreadDetail, useThreadList, useThreadMessages } from "../hooks/queries";
import { useMessagesRealtime } from "../hooks/realtime";

const categories: MessagingThreadCategory[] = ["primary", "transactions", "requests"];

const formatRelativeTime = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const minutes = Math.round(diff / 60000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, "hour");
  const days = Math.round(hours / 24);
  return rtf.format(days, "day");
};

const formatDayKey = (iso: string) => new Date(iso).toDateString();
const formatDayLabel = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));
const formatTimeLabel = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(iso));

const flattenThreads = (pages: { items: MessagingThreadSummary[] }[] | undefined): MessagingThreadSummary[] =>
  pages?.flatMap((page) => page.items) ?? [];

const unreadCount = (items: MessagingThreadSummary[]) => items.reduce((sum, item) => sum + item.unreadCount, 0);

const formatCount = (count: number) => (count > 99 ? "99+" : String(count));

const flattenMessages = (pages: { items: MessagingThreadMessage[] }[] | undefined): MessagingThreadMessage[] => {
  if (!pages) return [];
  return [...pages]
    .reverse()
    .flatMap((page) => page.items)
    .sort((a, b) => {
      if (a.createdAt === b.createdAt) return Number(a.id) - Number(b.id);
      return a.createdAt.localeCompare(b.createdAt);
    });
};

export function MessagingView({ threadId }: { threadId: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const session = useSession();
  const canLoadProtectedData =
    session.status === "signed_in" && Boolean(session.me?.userId);

  const currentCategory = (searchParams.get("tab")?.toLowerCase() as MessagingThreadCategory) || "primary";
  const category = categories.includes(currentCategory) ? currentCategory : "primary";

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [composer, setComposer] = useState("");
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const lastMarkedReadRef = useRef<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const threadListQuery = useThreadList(category, debouncedSearch, canLoadProtectedData);
  const threads = useMemo(() => flattenThreads(threadListQuery.data?.pages), [threadListQuery.data?.pages]);
  const primaryThreadsQuery = useThreadList("primary", "", canLoadProtectedData);
  const transactionsThreadsQuery = useThreadList("transactions", "", canLoadProtectedData);
  const requestThreadsQuery = useThreadList("requests", "", canLoadProtectedData);
  const tabUnreadCounts = useMemo(
    () => ({
      primary: unreadCount(flattenThreads(primaryThreadsQuery.data?.pages)),
      transactions: unreadCount(flattenThreads(transactionsThreadsQuery.data?.pages)),
      requests: unreadCount(flattenThreads(requestThreadsQuery.data?.pages)),
    }),
    [primaryThreadsQuery.data?.pages, requestThreadsQuery.data?.pages, transactionsThreadsQuery.data?.pages],
  );

  const activeThreadId = threadId;
  const threadDetailQuery = useThreadDetail(activeThreadId, canLoadProtectedData);
  const threadMessagesQuery = useThreadMessages(activeThreadId, canLoadProtectedData);
  const messages = useMemo(() => flattenMessages(threadMessagesQuery.data?.pages), [threadMessagesQuery.data?.pages]);

  const realtime = useMessagesRealtime({
    currentUserId: session.me?.userId,
    activeThreadId,
    enabled: canLoadProtectedData,
  });

  const sendMutation = useSendThreadMessage(session.me?.userId);
  const markReadMutation = useMarkThreadRead();
  const resolveRequestMutation = useResolveThreadRequest();
  const serverLastReadMessageId = threadDetailQuery.data?.lastReadMessageId;

  useEffect(() => {
    if (!activeThreadId || messages.length === 0 || !session.me?.userId) return;
    const last = messages[messages.length - 1];
    if (!last || last.senderUserId === session.me.userId) return;
    if (last.id === serverLastReadMessageId) return;
    const dedupeKey = `${activeThreadId}:${last.id}`;
    if (lastMarkedReadRef.current === dedupeKey) return;
    if (markReadMutation.isPending) return;
    lastMarkedReadRef.current = dedupeKey;
    markReadMutation.mutate({ threadId: activeThreadId, lastReadMessageId: last.id });
  }, [activeThreadId, markReadMutation, messages, serverLastReadMessageId, session.me?.userId]);

  useEffect(() => {
    if (!timelineRef.current) return;
    timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
  }, [messages.length, activeThreadId]);

  const onSelectThread = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", category);
    if (debouncedSearch) params.set("q", debouncedSearch);
    router.push(`/messages/${id}?${params.toString()}`);
  };

  const updateQuery = (next: { tab?: MessagingThreadCategory; q?: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next.tab) params.set("tab", next.tab);
    if (typeof next.q === "string") {
      if (next.q.trim()) params.set("q", next.q.trim());
      else params.delete("q");
    }
    const base = pathname.startsWith("/messages/") ? "/messages" : pathname;
    router.replace(`${base}?${params.toString()}`);
  };

  const handleSend = () => {
    if (!activeThreadId) return;
    const text = composer.trim();
    if (!text) return;
    const clientId = crypto.randomUUID();
    sendMutation.mutate({ threadId: activeThreadId, body: text, clientId });
    setComposer("");
  };

  const partner = threadDetailQuery.data?.participants.find((participant) => participant.id !== session.me?.userId)
    ?? threadDetailQuery.data?.participants[0];
  const peerReadMessageId = activeThreadId ? realtime.peerReadMessageByThread[activeThreadId] : undefined;
  const latestSeenOwnMessageId = useMemo(() => {
    if (!session.me?.userId || !peerReadMessageId) return null;
    const peerReadInt = Number.parseInt(peerReadMessageId, 10);
    if (!Number.isFinite(peerReadInt)) return null;
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const message = messages[i];
      if (message.senderUserId !== session.me.userId) continue;
      const messageIDInt = Number.parseInt(message.id, 10);
      if (!Number.isFinite(messageIDInt)) continue;
      if (messageIDInt <= peerReadInt) return message.id;
    }
    return null;
  }, [messages, peerReadMessageId, session.me?.userId]);

  const showOfflineBanner = !realtime.networkOnline;
  const showRealtimeLagBanner = realtime.networkOnline && realtime.connectionStatus !== "connected";
  const isActionableRequest = Boolean(threadDetailQuery.data?.activeRequest && threadDetailQuery.data?.canResolveRequest);

  const inboxPanel = (
    <div className="flex h-full min-h-0 flex-col border-r border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm font-semibold text-foreground">{session.me?.username || "Messages"}</p>
      </div>

      <div className="border-b border-border px-2 py-2">
        <div className="grid grid-cols-3 gap-1 rounded-md bg-background p-1">
          {categories.map((tab) => (
            <Button
              key={tab}
              variant={tab === category ? "secondary" : "ghost"}
              className="h-8 justify-center gap-1 text-xs"
              onClick={() => updateQuery({ tab })}
            >
              <span className="capitalize">{tab}</span>
              <Badge variant={tab === category ? "default" : "outline"} className="h-4 px-1.5 text-[10px] leading-none">
                {formatCount(tabUnreadCounts[tab])}
              </Badge>
            </Button>
          ))}
        </div>
        <Input
          value={search}
          onChange={(event) => {
            const value = event.target.value;
            setSearch(value);
            updateQuery({ q: value });
          }}
          placeholder="Search"
          className="mt-2"
        />
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="p-2">
          {threads.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-background px-4 py-8 text-center text-sm text-muted-foreground">
              {debouncedSearch ? "No conversations match your search." : "No conversations yet."}
            </div>
          ) : null}

          {threads.map((item) => {
            const active = item.id === activeThreadId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectThread(item.id)}
                className={`mb-1 flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                  active ? "border-border bg-accent" : "border-transparent bg-card hover:bg-accent/60"
                }`}
              >
                <UserAvatar
                  src={item.participant.avatarUrl}
                  displayName={item.participant.displayName || item.participant.username || "User"}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{item.participant.displayName || item.participant.username}</p>
                    <span className="text-xs text-muted-foreground">{formatRelativeTime(item.lastMessageAt)}</span>
                  </div>
                  <p className={`truncate text-xs ${item.hasUnread ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                    {item.lastMessage?.body || "No messages yet"}
                  </p>
                </div>
                {item.hasUnread ? <span className="size-2 rounded-full bg-primary" /> : null}
              </button>
            );
          })}

          {threadListQuery.hasNextPage ? (
            <Button
              variant="ghost"
              className="mt-2 w-full"
              disabled={threadListQuery.isFetchingNextPage}
              onClick={() => threadListQuery.fetchNextPage()}
            >
              {threadListQuery.isFetchingNextPage ? "Loading..." : "Load more"}
            </Button>
          ) : null}
        </div>
      </ScrollArea>
    </div>
  );

  const threadPanel = !activeThreadId ? (
    <div className="flex h-full min-h-0 items-center justify-center bg-background p-8 text-sm text-muted-foreground">
      Select a conversation.
    </div>
  ) : (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        {isMobile ? (
          <Link href={`/messages?tab=${category}`}>
            <Button variant="ghost" size="icon" className="shrink-0">
              Back
            </Button>
          </Link>
        ) : null}

        <UserAvatarDetail
          src={partner?.avatarUrl || ""}
          displayName={partner?.displayName || partner?.username || "Conversation"}
          username={partner?.username || "unknown"}
        />
        {isActionableRequest ? (
          <Badge variant="outline" className="ml-auto">Message request</Badge>
        ) : null}
      </div>

      {isActionableRequest ? (
        <div className="border-b border-border bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-900">This conversation is still in your requests inbox.</p>
          <p className="mt-1 text-xs text-amber-800">
            Accept to move it into normal messaging. Decline hides it from your inbox until a new direct thread is opened again.
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              onClick={() => {
                if (!activeThreadId) return;
                resolveRequestMutation.mutate({ threadId: activeThreadId, action: "accept" });
              }}
              disabled={resolveRequestMutation.isPending}
            >
              Accept
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (!activeThreadId) return;
                resolveRequestMutation.mutate(
                  { threadId: activeThreadId, action: "decline" },
                  {
                    onSuccess: () => {
                      router.replace("/messages?tab=requests");
                    },
                  },
                );
              }}
              disabled={resolveRequestMutation.isPending}
            >
              Decline
            </Button>
          </div>
        </div>
      ) : null}

      {showOfflineBanner ? (
        <div className="border-b border-destructive/40 bg-destructive/10 px-4 py-2 text-xs text-destructive">
          Offline. Realtime updates are paused until your connection is restored.
        </div>
      ) : null}
      {showRealtimeLagBanner ? (
        <div className="border-b border-amber-300/40 bg-amber-50 px-4 py-2 text-xs text-amber-800">
          Realtime connection {realtime.connectionStatus}. Trying to reconnect.
        </div>
      ) : null}

      <div ref={timelineRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {threadMessagesQuery.hasNextPage ? (
          <div className="mb-3 flex justify-center">
            <Button variant="outline" size="sm" disabled={threadMessagesQuery.isFetchingNextPage} onClick={() => threadMessagesQuery.fetchNextPage()}>
              {threadMessagesQuery.isFetchingNextPage ? "Loading..." : "Load older messages"}
            </Button>
          </div>
        ) : null}

        {messages.length === 0 ? (
          <div className="mt-16 text-center text-sm text-muted-foreground">No messages yet.</div>
        ) : null}

        {messages.map((message, index) => {
          const previous = index > 0 ? messages[index - 1] : null;
          const showDay = !previous || formatDayKey(previous.createdAt) !== formatDayKey(message.createdAt);
          const own = message.senderUserId === session.me?.userId;
          return (
            <div key={message.id}>
              {showDay ? (
                <div className="my-4 text-center text-xs text-muted-foreground">{formatDayLabel(message.createdAt)}</div>
              ) : null}
              <div className={`mb-1 flex ${own ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${own ? "bg-primary text-primary-foreground" : "bg-card text-foreground"}`}>
                  <p className="whitespace-pre-wrap break-words">{message.body}</p>
                  <p className={`mt-1 text-[10px] ${own ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{formatTimeLabel(message.createdAt)}</p>
                  {own && latestSeenOwnMessageId === message.id ? (
                    <p className="mt-0.5 text-[10px] text-primary-foreground/80">Seen</p>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-border bg-card p-3">
        {threadDetailQuery.data?.canSend ? (
          <div className="flex items-end gap-2">
            <Textarea
              rows={1}
              value={composer}
              onChange={(event) => setComposer(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Message..."
              className="min-h-10 resize-none"
            />
            <Button onClick={handleSend} disabled={!composer.trim() || sendMutation.isPending}>Send</Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Accept this request before you can reply.</p>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <AuthGuard title="Sign in to access messages" description="Messaging is available for authenticated members.">
        <div className="h-[calc(100vh-4rem)] overflow-hidden bg-background">
          {activeThreadId ? threadPanel : inboxPanel}
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard title="Sign in to access messages" description="Messaging is available for authenticated members.">
      <div className="h-[calc(100vh-4rem)] overflow-hidden bg-background">
        <div className="mx-auto grid h-full grid-cols-[22rem_1fr] border-x border-border">
          {inboxPanel}
          {threadPanel}
        </div>
      </div>
    </AuthGuard>
  );
}
