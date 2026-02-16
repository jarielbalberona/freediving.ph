"use client";

import { useState } from "react";
import { Thread } from '@freediving.ph/types';
import { useLikeThread, useUnlikeThread } from "../hooks";

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
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {thread.title}
          </h3>
          <p className="text-gray-600 line-clamp-3">{thread.content}</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
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
        <div className="flex flex-wrap gap-2 mb-4">
          {thread.tags.map((tag, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={handleLike}
          disabled={likeThread.isPending || unlikeThread.isPending}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
            liked
              ? "bg-red-100 text-red-600 hover:bg-red-200"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <svg
            className="w-4 h-4"
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
        </button>

        <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span>Comment</span>
        </button>
      </div>
    </div>
  );
}
