"use client";

import { useCallback, useMemo, useState } from "react";
import { ArrowBigDown, ArrowBigUp, MessageCircle } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ThreadDetail } from "@/features/chika";
import {
  useThread,
  useThreadComments,
  useCreateComment,
  useSetCommentReaction,
  useRemoveCommentReaction,
  useChikaRealtime,
} from "@/features/chika";
import { useSession } from "@/features/auth/session/use-session";
import type { ChikaCommentView } from "@/features/chika";
import {
  commentSchema,
  type CommentValues,
} from "@/features/chika/schemas/comment.schema";
import { getApiErrorMessage, getApiErrorStatus } from "@/lib/http/api-error";
import { cn } from "@/lib/utils";
import { UserIdentityHeader } from "@/components/common/UserIdentityHeader";
import { LinkedCommentText } from "@/components/common/LinkedCommentText";
import { ReportAction } from "@/components/report/report-action";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const toRelativeTime = (value: string) => {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  if (Number.isNaN(diffMs)) return "just now";

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < hour) return `${Math.max(1, Math.floor(diffMs / minute))}m ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
  return `${Math.floor(diffMs / day)}d ago`;
};

const ROOT_COMMENT_KEY = "__root__";
type CommentSort = "hot" | "top" | "new";

function ChikaDetailSkeleton() {
  return (
    <main>
      <div className="xl:pr-96">
        <div className="px-4 py-10 sm:px-6 lg:px-8 lg:py-6">
          <div className="container mx-auto max-w-screen-lg space-y-6 px-4 sm:px-6 lg:px-8">
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <Skeleton className="h-4 w-64 max-w-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-7 w-3/4 max-w-2xl" />
              <div className="mt-3 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Skeleton className="h-9 w-28 rounded-full" />
                <Skeleton className="h-9 w-20 rounded-full" />
              </div>
            </div>

            <div className="space-y-3">
              <Skeleton className="h-28 w-full rounded-2xl" />
              <div className="flex justify-end">
                <Skeleton className="h-9 w-28 rounded-md" />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-8 w-32 rounded-4xl" />
            </div>

            <div className="divide-y divide-border/60">
              {Array.from({ length: 3 }, (_, index) => (
                <article
                  key={`chika-comment-skeleton-${index + 1}`}
                  className="space-y-3 py-4 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-8 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-40 max-w-full" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <div className="space-y-2 pl-11">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                  <div className="flex items-center gap-2 pl-11">
                    <Skeleton className="h-7 w-20 rounded-full" />
                    <Skeleton className="h-7 w-16 rounded-md" />
                    <Skeleton className="size-7 rounded-full" />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

const buildCommentTree = (comments: ChikaCommentView[]) => {
  const grouped = new Map<string, ChikaCommentView[]>();
  for (const comment of comments) {
    const key = comment.parentCommentId || ROOT_COMMENT_KEY;
    const existing = grouped.get(key);
    if (existing) {
      existing.push(comment);
    } else {
      grouped.set(key, [comment]);
    }
  }
  return grouped;
};

const sortComments = (comments: ChikaCommentView[], sortMode: CommentSort) => {
  const list = [...comments];
  if (sortMode === "new") {
    return list.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }
  if (sortMode === "top") {
    return list.sort(
      (a, b) =>
        b.voteCount - a.voteCount ||
        b.replyCount - a.replyCount ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }
  return list.sort((a, b) => {
    const hotA = a.voteCount * 2 + a.replyCount;
    const hotB = b.voteCount * 2 + b.replyCount;
    return (
      hotB - hotA ||
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  });
};

function CommentActions({
  comment,
  threadId,
}: {
  comment: ChikaCommentView;
  threadId: string;
}) {
  const setCommentReaction = useSetCommentReaction();
  const removeCommentReaction = useRemoveCommentReaction();
  const reaction = comment.userReaction ?? null;

  const isBusy =
    setCommentReaction.isPending || removeCommentReaction.isPending;

  const onVote = useCallback(
    (nextReaction: "upvote" | "downvote") => {
      if (isBusy) return;
      if (reaction === nextReaction) {
        removeCommentReaction.mutate({
          threadId,
          commentId: comment.id,
        });
        return;
      }
      setCommentReaction.mutate({
        threadId,
        commentId: comment.id,
        type: nextReaction,
      });
    },
    [
      comment.id,
      isBusy,
      reaction,
      removeCommentReaction,
      setCommentReaction,
      threadId,
    ],
  );

  return (
    <div className="inline-flex items-center gap-0.5 text-muted-foreground">
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="Upvote comment"
        aria-pressed={reaction === "upvote"}
        className={`size-7 p-0 ${reaction === "upvote" ? "text-primary" : "text-muted-foreground"}`}
        onClick={() => onVote("upvote")}
        disabled={isBusy}
      >
        <ArrowBigUp className="size-4" />
      </Button>
      <span className="min-w-5 text-center text-xs font-semibold text-foreground">
        {comment.voteCount}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="Downvote comment"
        aria-pressed={reaction === "downvote"}
        className={`size-7 p-0 ${reaction === "downvote" ? "text-primary" : "text-muted-foreground"}`}
        onClick={() => onVote("downvote")}
        disabled={isBusy}
      >
        <ArrowBigDown className="size-4" />
      </Button>
    </div>
  );
}

export default function ChikaDetailClient({ slug }: { slug: string }) {
  const session = useSession();
  const { data: thread, isLoading, error } = useThread(slug);
  const threadId = thread?.id ?? "";
  useChikaRealtime({
    enabled: Boolean(threadId),
    threadId,
    currentUserId: session.me?.userId,
  });
  const { data: comments } = useThreadComments(threadId, Boolean(threadId));
  const createComment = useCreateComment();
  const [sortMode, setSortMode] = useState<CommentSort>("hot");
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const form = useForm<CommentValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { content: "" },
  });

  const onSubmit = async (values: CommentValues) => {
    await createComment.mutateAsync({
      threadId,
      content: values.content.trim(),
    });
    form.reset({ content: "" });
  };

  const commentTree = useMemo(
    () => buildCommentTree(comments ?? []),
    [comments],
  );

  const submitReply = async (parentCommentId: string) => {
    const content = replyContent.trim();
    if (!content) return;
    await createComment.mutateAsync({ threadId, content, parentCommentId });
    setReplyContent("");
    setActiveReplyId(null);
  };

  const renderComment = (comment: ChikaCommentView, depth = 0) => {
    const children = sortComments(commentTree.get(comment.id) ?? [], sortMode);
    return (
      <article
        key={comment.id}
        className={cn(
          depth === 0
            ? "py-4 first:pt-0 last:pb-0"
            : "py-3 first:pt-0 last:pb-0",
          comment.isHidden && "opacity-60",
        )}
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <UserIdentityHeader
                displayName={comment.authorDisplayName}
                username={comment.authorDisplayName}
                avatarUrl={comment.authorAvatarUrl}
                showProfileImage={Boolean(comment.authorAvatarUrl)}
                time={toRelativeTime(comment.createdAt)}
                className="min-w-0 flex-1"
              />
              {comment.isHidden ? (
                <Badge
                  variant="destructive"
                  className="text-[10px] uppercase tracking-wide"
                >
                  Hidden
                </Badge>
              ) : null}
            </div>
            <LinkedCommentText
              text={comment.content}
              className="text-sm leading-relaxed"
            />
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <CommentActions comment={comment} threadId={threadId} />
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="h-7 px-2 text-muted-foreground"
                onClick={() => {
                  setReplyContent("");
                  setActiveReplyId((current) =>
                    current === comment.id ? null : comment.id,
                  );
                }}
              >
                <MessageCircle className="size-3.5" />
                Reply
              </Button>
              {comment.replyCount > 0 ? (
                <span className="px-1 text-xs text-muted-foreground">
                  {comment.replyCount} repl
                  {comment.replyCount === 1 ? "y" : "ies"}
                </span>
              ) : null}
              <ReportAction
                targetType="chika_comment"
                targetId={comment.id}
                appearance="icon"
                className="size-7"
              />
            </div>

            {activeReplyId === comment.id ? (
              <div className="mt-3 space-y-2">
                <Textarea
                  value={replyContent}
                  onChange={(event) => setReplyContent(event.target.value)}
                  placeholder="Write a reply..."
                  rows={3}
                  className="rounded-xl"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setActiveReplyId(null);
                      setReplyContent("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => submitReply(comment.id)}
                    disabled={createComment.isPending || !replyContent.trim()}
                  >
                    {createComment.isPending ? "Replying..." : "Reply"}
                  </Button>
                </div>
              </div>
            ) : null}

            {children.length > 0 ? (
              <div className="mt-4 border-l border-border/60 pl-3 sm:pl-4">
                <div className="divide-y divide-border/50">
                  {children.map((child) => renderComment(child, depth + 1))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </article>
    );
  };

  if (isLoading) {
    return <ChikaDetailSkeleton />;
  }

  if (error) {
    const message =
      getApiErrorStatus(error) === 404
        ? "This Chika is no longer available."
        : getApiErrorMessage(error, "Something went wrong loading this Chika.");
    return (
      <main>
        <div className="xl:pr-96">
          <div className="px-4 py-10 sm:px-6 lg:px-8 lg:py-6">
            <div className="container mx-auto max-w-screen-lg px-4 sm:px-6 lg:px-8">
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  {message}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!thread) {
    return (
      <main>
        <div className="xl:pr-96">
          <div className="px-4 py-10 sm:px-6 lg:px-8 lg:py-6">
            <div className="container mx-auto max-w-screen-lg px-4 sm:px-6 lg:px-8">
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  This Chika is no longer available.
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="xl:pr-96">
        <div className="px-4 py-10 sm:px-6 lg:px-8 lg:py-6">
          <div className="container mx-auto max-w-screen-lg space-y-6 px-4 sm:px-6 lg:px-8">
            <ThreadDetail thread={thread} />

            {thread.categoryPseudonymous ? (
              <Card className="border-dashed">
                <CardContent className="p-4 text-sm text-muted-foreground">
                  This Chika is anonymous. Comments and replies use community
                  aliases.
                </CardContent>
              </Card>
            ) : null}

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-3"
              >
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder="Join the conversation"
                          rows={3}
                          className="rounded-2xl px-5 py-4"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={
                      form.formState.isSubmitting || createComment.isPending
                    }
                  >
                    {form.formState.isSubmitting || createComment.isPending
                      ? "Posting..."
                      : "Post comment"}
                  </Button>
                </div>
              </form>
            </Form>

            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="font-medium">Sort by:</span>
              <Select
                value={sortMode}
                onValueChange={(value) => setSortMode(value as CommentSort)}
                items={[
                  { value: "hot", label: "Hot" },
                  { value: "top", label: "Top" },
                  { value: "new", label: "New" },
                ]}
              >
                <SelectTrigger size="sm" className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hot">Hot</SelectItem>
                  <SelectItem value="top">Top</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              {(comments ?? []).length === 0 ? (
                <Card className="border-dashed border-border/70 bg-muted/30">
                  <CardContent className="p-5 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">
                      Be the first to reply
                    </p>
                    <p className="mt-1">
                      Add a helpful answer, a local note, or a safety reminder.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="divide-y divide-border/60">
                  {sortComments(
                    commentTree.get(ROOT_COMMENT_KEY) ?? [],
                    sortMode,
                  ).map((comment) => renderComment(comment))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
