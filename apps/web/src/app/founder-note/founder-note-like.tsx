"use client";

import { FishSymbol } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "freedivingph-founder-note-liked";

export function FounderNoteLike() {
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    try {
      setLiked(window.localStorage.getItem(STORAGE_KEY) === "true");
    } catch {
      setLiked(false);
    }
  }, []);

  const toggleLiked = () => {
    setLiked((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Local preference only. If storage is unavailable, the button still works for this render.
      }
      return next;
    });
  };

  return (
    <button
      type="button"
      aria-pressed={liked}
      aria-label={liked ? "Unlike founder's note" : "Like founder's note"}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
      onClick={toggleLiked}
    >
      <FishSymbol
        className={`size-4 ${liked ? "fill-current" : ""}`}
        aria-hidden
      />
      {liked ? "Liked" : "Like"}
    </button>
  );
}
