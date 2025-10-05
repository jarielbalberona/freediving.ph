"use client";

import { useState } from "react";
import { MessageSquare, ArrowBigUp, ArrowBigDown, Send } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { useThread, useThreadComments, useCreateComment, useAddReaction, ThreadWithUser } from "@/hooks/react-queries/threads";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ThreadDetailProps {
  thread: ThreadWithUser;
}

export default function ThreadDetail({ thread: initialThread }: ThreadDetailProps) {
  const { user } = useUser();
  const [commentText, setCommentText] = useState("");
  const { data: thread, isLoading: threadLoading } = useThread(initialThread.thread.id);
  const { data: comments, isLoading: commentsLoading } = useThreadComments(initialThread.thread.id);
  const createComment = useCreateComment();
  const addReaction = useAddReaction();

  // Use initial data if available, otherwise use fetched data
  const currentThread = thread || initialThread;

  const handleVote = async (type: "1" | "0") => {
    if (!user) {
      toast.error("Please sign in to vote");
      return;
    }

    try {
      await addReaction.mutateAsync({
        threadId: initialThread.thread.id,
        data: { type }
      });
      toast.success("Vote recorded!");
    } catch (error) {
      toast.error("Failed to vote");
    }
  };

  const handleComment = async () => {
    if (!user) {
      toast.error("Please sign in to comment");
      return;
    }

    if (!commentText.trim()) {
      toast.error("Please enter a comment");
      return;
    }

    try {
      await createComment.mutateAsync({
        threadId: initialThread.thread.id,
        content: commentText.trim()
      });
      setCommentText("");
      toast.success("Comment added!");
    } catch (error) {
      toast.error("Failed to add comment");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  if (threadLoading) {
    return (
      <div className="space-y-4">
        <div className="p-6 rounded-lg bg-card animate-pulse">
          <div className="flex items-start space-x-4">
            <div className="flex flex-col items-center space-y-2">
              <div className="w-6 h-6 bg-muted rounded"></div>
              <div className="w-4 h-4 bg-muted rounded"></div>
              <div className="w-6 h-6 bg-muted rounded"></div>
            </div>
            <div className="flex-1 space-y-2">
              <div className="h-6 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-full"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentThread) {
    return <h1>Thread not found</h1>;
  }

  return (
    <div className="space-y-6">
      {/* Thread Content */}
      <div className="p-6 rounded-lg bg-card">
        <div className="flex items-start space-x-4">
          <div className="flex flex-col items-center space-y-1 text-muted-foreground">
            <button
              className="hover:text-primary transition-colors"
              aria-label="Upvote"
              onClick={() => handleVote("1")}
              disabled={addReaction.isPending}
            >
              <ArrowBigUp className="w-6 h-6" />
            </button>
            <span className="text-sm font-medium">
              {thread.upvotes - thread.downvotes}
            </span>
            <button
              className="hover:text-primary transition-colors"
              aria-label="Downvote"
              onClick={() => handleVote("0")}
              disabled={addReaction.isPending}
            >
              <ArrowBigDown className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1">
            <h1 className="mb-2 text-2xl font-bold text-foreground">{currentThread.thread.title}</h1>
            <p className="mb-4 text-muted-foreground whitespace-pre-wrap">{currentThread.thread.content}</p>
            <div className="flex items-center text-sm text-muted-foreground">
              <span>Posted by {currentThread.user.username}</span>
              <span className="mx-2">•</span>
              <span>{formatDate(currentThread.thread.createdAt)}</span>
              <span className="mx-2">•</span>
              <span className="flex items-center">
                <MessageSquare className="w-4 h-4 mr-1" />
                {currentThread.commentCount} comments
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Comment Form */}
      {user && (
        <div className="p-4 rounded-lg bg-card">
          <h3 className="mb-3 text-lg font-semibold">Add a comment</h3>
          <div className="space-y-3">
            <Textarea
              placeholder="What are your thoughts?"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleComment}
                disabled={createComment.isPending || !commentText.trim()}
              >
                <Send className="w-4 h-4 mr-2" />
                {createComment.isPending ? "Posting..." : "Post Comment"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Comments */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          Comments ({currentThread.commentCount})
        </h3>

        {commentsLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 rounded-lg bg-card animate-pulse">
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-1/4"></div>
                  <div className="h-3 bg-muted rounded w-full"></div>
                  <div className="h-3 bg-muted rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {comments?.map(({ comment, user: commentUser }) => (
              <div key={comment.id} className="p-4 rounded-lg bg-card">
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <span className="font-medium">{commentUser.username}</span>
                    <span className="mx-2">•</span>
                    <span>{formatDate(comment.createdAt)}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                </div>
              </div>
            ))}
            {comments?.length === 0 && (
              <p className="text-muted-foreground text-center py-8">
                No comments yet. Be the first to comment!
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
