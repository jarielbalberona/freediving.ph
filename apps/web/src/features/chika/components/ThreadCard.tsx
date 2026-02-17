"use client";

import { useState } from "react";
import { Thread } from '@freediving.ph/types';
import { useLikeThread, useUnlikeThread } from "../hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ThreadCardProps {
  thread: Thread;
  isLiked?: boolean;
}

export default function ThreadCard({ thread, isLiked = false }: ThreadCardProps) {
  const [liked, setLiked] = useState(isLiked);
  const likeThread = useLikeThread();
  const unlikeThread = useUnlikeThread();

  const handleLike = async () => {
    if (liked) {
      setLiked(false);
      unlikeThread.mutate(thread.id);
    } else {
      setLiked(true);
      likeThread.mutate(thread.id);
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex-1">
            <h3 className="mb-2 text-lg font-semibold text-foreground">
              {thread.title}
            </h3>
            <p className="line-clamp-3 text-muted-foreground">{thread.content}</p>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center space-x-4">
            <span>By {thread.author.alias || thread.author.username}</span>
            <span>•</span>
            <span>{new Date(thread.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>{thread.commentCount} comments</span>
          </div>
        </div>

        {thread.tags && thread.tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {thread.tags.map((tag, index) => (
              <Badge key={index} variant="secondary">
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <Button
            onClick={handleLike}
            disabled={likeThread.isPending || unlikeThread.isPending}
            variant={liked ? "destructive" : "secondary"}
          >
            <svg
              className="h-4 w-4"
              fill={liked ? "currentColor" : "none"}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            <span>{thread.likeCount}</span>
          </Button>

          <Button variant="outline">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <span>Comment</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
