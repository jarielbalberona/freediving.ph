"use client";

import { use as usePromise } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ThreadDetail } from "@/features/chika";
import { useThread, useThreadComments, useCreateComment } from "@/features/chika";
import { commentSchema, type CommentValues } from "@/features/chika/schemas/comment.schema";
import { getApiErrorMessage, getApiErrorStatus } from "@/lib/http/api-error";
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

export default function Chika({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const { data: thread, isLoading, error } = useThread(id);
  const { data: comments } = useThreadComments(id);
  const createComment = useCreateComment();

  const form = useForm<CommentValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { content: "" },
  });

  const onSubmit = async (values: CommentValues) => {
    await createComment.mutateAsync({ threadId: id, content: values.content.trim() });
    form.reset({ content: "" });
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

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder="Write a comment..."
                          rows={3}
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
          </div>
        </div>
      </div>
    </main>
  );
}
