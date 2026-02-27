"use client";

import { use as usePromise, useState } from "react";

import { ThreadDetail } from "@/features/chika";
import { useThread, useThreadComments, useCreateComment } from "@/features/chika";
import { getApiErrorMessage, getApiErrorStatus } from "@/lib/http/api-error";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function Chika({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const { data: thread, isLoading, error } = useThread(id);
  const { data: comments } = useThreadComments(id);
  const createComment = useCreateComment();
  const [commentContent, setCommentContent] = useState("");

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

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim()) return;
    await createComment.mutateAsync({ threadId: id, content: commentContent });
    setCommentContent("");
  };

  return (
    <main>
      <div className="xl:pr-96">
        <div className="px-4 py-10 sm:px-6 lg:px-8 lg:py-6">
          <div className="container mx-auto max-w-screen-lg space-y-6 px-4 sm:px-6 lg:px-8">
            <ThreadDetail thread={thread} />

            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Comments</h2>
              {(comments ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No comments yet.</p>
              ) : null}
              {(comments ?? []).map((comment) => (
                <Card key={comment.id} className={comment.isHidden ? "border-dashed opacity-60" : ""}>
                  <CardContent className="p-4">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-sm font-medium">{comment.authorDisplayName}</span>
                      {comment.isHidden ? (
                        <Badge variant="destructive" className="text-xs">Hidden</Badge>
                      ) : null}
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm">{comment.content}</p>
                    {comment.realAuthorUserId ? (
                      <p className="mt-1 text-xs text-muted-foreground/70">
                        Real author: {comment.realAuthorUserId}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>

            <form onSubmit={handleSubmitComment} className="space-y-2">
              <Textarea
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder="Write a comment..."
                rows={3}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={createComment.isPending || !commentContent.trim()}>
                  {createComment.isPending ? "Posting..." : "Post Comment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
