"use client";

import Link from "next/link";
import { ArrowBigDown, ArrowBigUp, MessageSquare } from "lucide-react";
import { useThreads, useAddReaction, useRemoveReaction, ThreadWithUser } from "@/hooks/react-queries/threads";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";

const Thread = ({ initialThreads }: { initialThreads: ThreadWithUser[] | null }) => {
  const { data: threads, isLoading } = useThreads(initialThreads);
  const { user } = useUser();
  const addReaction = useAddReaction();
  const removeReaction = useRemoveReaction();

  const handleVote = async (threadId: number, type: "1" | "0") => {
    if (!user) {
      toast.error("Please sign in to vote");
      return;
    }

    try {
      await addReaction.mutateAsync({
        threadId,
        data: { type }
      });
      toast.success("Vote recorded!");
    } catch (error) {
      toast.error("Failed to vote");
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-4 rounded-lg bg-card animate-pulse">
            <div className="flex items-start space-x-4">
              <div className="flex flex-col items-center space-y-2">
                <div className="w-6 h-6 bg-muted rounded"></div>
                <div className="w-4 h-4 bg-muted rounded"></div>
                <div className="w-6 h-6 bg-muted rounded"></div>
              </div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-full"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {threads?.map(({ thread, user: threadUser, commentCount, upvotes, downvotes }) => (
        <div
          key={thread.id}
          className="block p-4 mb-2 transition-colors duration-200 rounded-lg bg-card hover:bg-accent"
        >
          <div className="flex items-start space-x-4">
            <div className="flex flex-col items-center space-y-1 text-muted-foreground">
              <button
                className="hover:text-primary transition-colors"
                aria-label="Upvote"
                onClick={() => handleVote(thread.id, "1")}
                disabled={addReaction.isPending}
              >
                <ArrowBigUp className="w-6 h-6" />
              </button>
              <span className="text-sm font-medium">
                {upvotes - downvotes}
              </span>
              <button
                className="hover:text-primary transition-colors"
                aria-label="Downvote"
                onClick={() => handleVote(thread.id, "0")}
                disabled={addReaction.isPending}
              >
                <ArrowBigDown className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1">
              <Link href={`/chika/${thread.id}`} className="block">
                <h2 className="mb-1 text-lg font-semibold text-foreground hover:text-primary transition-colors">
                  {thread.title}
                </h2>
                <p className="mb-2 text-sm text-muted-foreground line-clamp-2">
                  {thread.content}
                </p>
              </Link>
              <div className="flex items-center text-xs text-muted-foreground">
                <span>Posted by {threadUser.username}</span>
                <span className="mx-2">•</span>
                <span>{formatDate(thread.createdAt)}</span>
                <span className="mx-2">•</span>
                <span className="flex items-center">
                  <MessageSquare className="w-4 h-4 mr-1" />
                  {commentCount} comments
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
};

export default Thread;
