"use client";

import { use as usePromise, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowBigDown, ArrowBigUp, MessageCircle, Search } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ThreadDetail } from "@/features/chika";
import { useThread, useThreadComments, useCreateComment, useSetCommentReaction, useRemoveCommentReaction, useChikaRealtime } from "@/features/chika";
import { useSession } from "@/features/auth/session/use-session";
import type { ChikaCommentView } from "@/features/chika";
import { commentSchema, type CommentValues } from "@/features/chika/schemas/comment.schema";
import { getApiErrorMessage, getApiErrorStatus } from "@/lib/http/api-error";
import { UsernameLink } from "@/components/common/UsernameLink";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { getProfileRoute } from "@/lib/routes";
import { UserAvatarDetail } from "@/components/ui/user-avatar-detail";

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
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
    return hotB - hotA || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
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
  const [reaction, setReaction] = useState<"upvote" | "downvote" | null>(comment.userReaction ?? null);
  const lockRef = useRef(false);

  useEffect(() => {
    setReaction(comment.userReaction ?? null);
  }, [comment.userReaction]);

  const isBusy = setCommentReaction.isPending || removeCommentReaction.isPending || lockRef.current;

  const onVote = useCallback(async (nextReaction: "upvote" | "downvote") => {
    if (lockRef.current) return;
    lockRef.current = true;
    try {
      if (reaction === nextReaction) {
        await removeCommentReaction.mutateAsync({ threadId, commentId: comment.id });
        setReaction(null);
        return;
      }
      await setCommentReaction.mutateAsync({ threadId, commentId: comment.id, type: nextReaction });
      setReaction(nextReaction);
    } finally {
      lockRef.current = false;
    }
  }, [reaction, threadId, comment.id, setCommentReaction, removeCommentReaction]);

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-background px-1 py-0.5">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={`h-6 w-6 p-0 ${reaction === "upvote" ? "text-primary" : "text-muted-foreground"}`}
        onClick={() => onVote("upvote")}
        disabled={isBusy}
      >
        <ArrowBigUp className="h-4 w-4" />
      </Button>
      <span className="min-w-6 text-center text-xs font-semibold">{comment.voteCount}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={`h-6 w-6 p-0 ${reaction === "downvote" ? "text-primary" : "text-muted-foreground"}`}
        onClick={() => onVote("downvote")}
        disabled={isBusy}
      >
        <ArrowBigDown className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function Chika({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const session = useSession();
  useChikaRealtime({ enabled: true, threadId: id, currentUserId: session.me?.userId });
  const { data: thread, isLoading, error } = useThread(id);
  const { data: comments } = useThreadComments(id);
  const createComment = useCreateComment();
  const [sortMode, setSortMode] = useState<CommentSort>("hot");
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const form = useForm<CommentValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { content: "" },
  });

  const onSubmit = async (values: CommentValues) => {
    await createComment.mutateAsync({ threadId: id, content: values.content.trim() });
    form.reset({ content: "" });
  };

  const commentTree = useMemo(
    () => buildCommentTree(comments ?? []),
    [comments],
  );

  const submitReply = async (parentCommentId: string) => {
    const content = replyContent.trim();
    if (!content) return;
    await createComment.mutateAsync({ threadId: id, content, parentCommentId });
    setReplyContent("");
    setActiveReplyId(null);
  };

  const renderComment = (comment: ChikaCommentView) => {
    const children = sortComments(commentTree.get(comment.id) ?? [], sortMode);
    return (
      <div key={comment.id} className="space-y-2">
        <Card className={`p-4 ${comment.isHidden ? "border-dashed opacity-60" : ""}`}>
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <UserAvatarDetail
                  username={comment.authorDisplayName}
                  src={comment.authorAvatarUrl}
                />
                <span className="text-sm text-muted-foreground">· {toRelativeTime(comment.createdAt)}</span>
                {comment.isHidden ? (
                  <Badge variant="destructive" className="text-[10px] uppercase tracking-wide">Hidden</Badge>
                ) : null}
              </div>
              <p className="text-sm leading-relaxed">{comment.content}</p>
              {comment.realAuthorUserId ? (
                <p className="mt-1 text-xs text-muted-foreground/70">
                  Real author: {comment.realAuthorUserId}
                </p>
              ) : null}
              <div className="mt-3 flex items-center gap-2">
                <CommentActions comment={comment} threadId={id} />
                {comment.replyCount > 0 ? (
                  <span className="text-xs text-muted-foreground">
                    {comment.replyCount} repl{comment.replyCount === 1 ? "y" : "ies"}
                  </span>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-muted-foreground"
                  onClick={() => {
                    setReplyContent("");
                    setActiveReplyId((current) => (current === comment.id ? null : comment.id));
                  }}
                >
                  <MessageCircle className="h-4 w-4" />
                  Reply
                </Button>
              </div>

              {activeReplyId === comment.id ? (
                <div className="mt-2 space-y-2">
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
            </div>
          </div>
        </Card>
        {children.length > 0 ? (
          <div className="ml-5 border-l border-border/60 pl-3 sm:ml-7 sm:pl-4">
            <div className="space-y-2">
              {children.map((child) => renderComment(child))}
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  if (isLoading) {
    return (
      <main>
        <div className="xl:pr-96">
          <div className="px-4 py-10 sm:px-6 lg:px-8 lg:py-6">
            <div className="container mx-auto max-w-screen-lg px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-center py-12">
                <div className="text-muted-foreground">Loading thread...</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    const message = getApiErrorStatus(error) === 404
      ? "This thread has been removed or is no longer available."
      : getApiErrorMessage(error, "Something went wrong loading this thread.");
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
                  This thread is no longer available.
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
                  This is an anonymous thread. All comments and replies are automatically pseudonymous.
                </CardContent>
              </Card>
            ) : null}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
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
                    disabled={form.formState.isSubmitting || createComment.isPending}
                  >
                    {form.formState.isSubmitting || createComment.isPending ? "Posting..." : "Post Comment"}
                  </Button>
                </div>
              </form>
            </Form>

            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="font-medium">Sort by:</span>
              <label className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2">
                <Search className="h-4 w-4" />
                <select
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as CommentSort)}
                  className="bg-transparent text-sm text-foreground outline-none"
                >
                  <option value="hot">Hot</option>
                  <option value="top">Top</option>
                  <option value="new">New</option>
                </select>
              </label>
            </div>

            <div className="space-y-3">
              {(comments ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No comments yet.</p>
              ) : null}
              {sortComments(commentTree.get(ROOT_COMMENT_KEY) ?? [], sortMode).map((comment) => renderComment(comment))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
