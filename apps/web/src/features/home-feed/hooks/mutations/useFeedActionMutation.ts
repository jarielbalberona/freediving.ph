"use client";

import { useMutation } from "@tanstack/react-query";

import { postFeedActions } from "@/features/home-feed/api/post-feed-actions";
import type { FeedActionsRequest } from "@freediving.ph/types";

export const useFeedActionMutation = () =>
  useMutation({
    mutationFn: (payload: FeedActionsRequest) => postFeedActions(payload),
  });
