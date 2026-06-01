import { useAuth } from "@clerk/expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import type { ImagePickerAsset } from "expo-image-picker";
import type {
  ActivityFeedResponse,
  CreateMediaPostRequest,
  ActivityFeedItem,
  MediaPostComment,
  MediaPostCommentLikeState,
  MediaPostCommentListResponse,
  MediaPostDetailResponse,
  MediaPostLikeState,
  MediaPostSaveState,
} from "@freediving.ph/types";

import {
  completeMomentUpload,
  createMediaPost,
  createMediaPostComment,
  createMomentUploadIntent,
  deleteMediaPostComment,
  likeMediaPostComment,
  likeMediaPost,
  saveMediaPost,
  syncMomentStatus,
  unlikeMediaPost,
  unlikeMediaPostComment,
  unsaveMediaPost,
  uploadMediaFiles,
  uploadMomentToDirectUrl,
} from "@/features/media/api/media-api";
import {
  filenameForAsset,
  mimeTypeForAsset,
} from "@/features/media/lib/media-upload-guards";
import { FphgoApiError } from "@/lib/api";
import { mobileQueryKeys } from "@/lib/query";

type ActivityFeedOrInfinite =
  | ActivityFeedResponse
  | InfiniteData<ActivityFeedResponse>
  | undefined;

type CommentMutationContext = {
  commentsKey: ReturnType<typeof mobileQueryKeys.media.postCommentsRoot>;
  previousComments: Array<[readonly unknown[], MediaPostCommentListResponse | undefined]>;
};

const useRequiredToken = () => {
  const { getToken } = useAuth();
  return async () => {
    const token = await getToken();
    if (!token) throw new FphgoApiError(401, "Sign in to continue.", null);
    return token;
  };
};

const requirePostId = (postId: string) => {
  if (!postId) throw new FphgoApiError(400, "Moment unavailable.", null);
  return postId;
};

const nativeFileFromAsset = (asset: ImagePickerAsset, fallbackPrefix: string) => ({
  name: filenameForAsset(asset, fallbackPrefix),
  type: mimeTypeForAsset(asset),
  uri: asset.uri,
});

const clampCount = (value: number) => Math.max(0, Math.floor(value));

const patchFeedItemCount = (
  item: ActivityFeedItem,
  postId: string,
  delta: number,
) => {
  if (item.type !== "media_post_created" || item.sourceId !== postId) return item;

  const stats =
    typeof item.stats === "object" && item.stats !== null ? item.stats : {};
  const metadata =
    typeof item.metadata === "object" && item.metadata !== null
      ? item.metadata
      : {};

  const currentFromStats =
    typeof stats.commentCount === "number" && Number.isFinite(stats.commentCount)
      ? stats.commentCount
      : 0;
  const currentFromMetadata =
    typeof metadata.commentCount === "number" && Number.isFinite(metadata.commentCount)
      ? metadata.commentCount
      : 0;
  const nextCount = clampCount(Math.max(currentFromStats, currentFromMetadata) + delta);

  return {
    ...item,
    stats: {
      ...stats,
      commentCount: nextCount,
    },
    metadata: {
      ...metadata,
      commentCount: nextCount,
    },
  };
};

const patchFeedItemMediaState = (
  item: ActivityFeedItem,
  postId: string,
  patch: Record<string, unknown>,
) => {
  if (item.type !== "media_post_created" || item.sourceId !== postId) return item;

  return {
    ...item,
    stats: {
      ...(typeof item.stats === "object" && item.stats !== null ? item.stats : {}),
      ...patch,
    },
    metadata: {
      ...(typeof item.metadata === "object" && item.metadata !== null
        ? item.metadata
        : {}),
      ...patch,
    },
  };
};

const patchFeedMediaState = (
  current: ActivityFeedOrInfinite,
  postId: string,
  patch: Record<string, unknown>,
) => {
  if (!current) return current;

  if (
    typeof current === "object" &&
    "pages" in current &&
    Array.isArray(current.pages)
  ) {
    return {
      ...current,
      pages: current.pages.map((page) => ({
        ...page,
        items: page.items.map((item) =>
          patchFeedItemMediaState(item, postId, patch),
        ),
      })),
    } as ActivityFeedOrInfinite;
  }

  return {
    ...(current as ActivityFeedResponse),
    items: (current as ActivityFeedResponse).items.map((item) =>
      patchFeedItemMediaState(item, postId, patch),
    ),
  };
};

const patchFeedCommentCount = (
  current: ActivityFeedOrInfinite,
  postId: string,
  delta: number,
) => {
  if (!current) return current;

  if (
    typeof current === "object" &&
    "pages" in current &&
    Array.isArray(current.pages)
  ) {
    const pages = current.pages.map((page) => {
      if (!page || typeof page !== "object" || !("items" in page)) {
        return page;
      }
      return {
        ...page,
        items: page.items.map((item) => patchFeedItemCount(item, postId, delta)),
      };
    });

    return {
      ...current,
      pages,
    } as ActivityFeedOrInfinite;
  }

  return {
    ...(current as ActivityFeedResponse),
    items: (current as ActivityFeedResponse).items.map((item) =>
      patchFeedItemCount(item, postId, delta),
    ),
  };
};

const patchCommentList = (
  current: MediaPostCommentListResponse | undefined,
  mutateList: (items: MediaPostComment[]) => MediaPostComment[],
) =>
  current
    ? {
        ...current,
        items: mutateList(current.items),
      }
    : current;

const patchCommentLikeState = (
  comment: MediaPostComment,
  payload: MediaPostCommentLikeState,
) =>
  comment.id === payload.commentId
    ? {
        ...comment,
        likeCount: payload.likeCount,
        viewerHasLiked: payload.viewerHasLiked,
      }
    : comment;

const patchMediaPostDetailLikeState = (
  current: MediaPostDetailResponse | undefined,
  payload: MediaPostLikeState,
) =>
  current
    ? {
        ...current,
        post: {
          ...current.post,
          post: {
            ...current.post.post,
            likeCount: payload.likeCount,
            viewerHasLiked: payload.viewerHasLiked,
          },
        },
      }
    : current;

const patchMediaPostDetailSaveState = (
  current: MediaPostDetailResponse | undefined,
  payload: MediaPostSaveState,
) =>
  current
    ? {
        ...current,
        post: {
          ...current.post,
          post: {
            ...current.post.post,
            viewerHasSaved: payload.viewerHasSaved,
          },
        },
      }
    : current;

const patchMediaPostDetailCommentCount = (
  current: MediaPostDetailResponse | undefined,
  delta: number,
) =>
  current
    ? {
        ...current,
        post: {
          ...current.post,
          post: {
            ...current.post.post,
            commentCount: clampCount(current.post.post.commentCount + delta),
          },
        },
      }
    : current;

export const useCreatePhotoPostMutation = () => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (input: {
      assets: ImagePickerAsset[];
      caption?: string;
      diveSiteId: string;
    }) => {
      const token = await getRequiredToken();
      const upload = await uploadMediaFiles(
        input.assets.map((asset, index) =>
          nativeFileFromAsset(asset, `photo-${index + 1}`),
        ),
        "profile_feed",
        token,
      );
      if (upload.errors?.length) {
        throw new FphgoApiError(
          400,
          upload.errors[0]?.message ?? "Could not upload one of the photos.",
          upload,
        );
      }
      if (upload.items.length === 0) {
        throw new FphgoApiError(400, "Choose at least one photo.", upload);
      }
      const payload: CreateMediaPostRequest = {
        applyCaptionToAll: true,
        diveSiteId: input.diveSiteId,
        items: upload.items.map((item, index) => ({
          caption: input.caption || null,
          height: item.height,
          mediaObjectId: item.id,
          mimeType: item.mimeType,
          sortOrder: index,
          storageKey: item.objectKey,
          type: "photo",
          width: item.width,
        })),
        postCaption: input.caption || null,
        source: "create_post",
      };
      return createMediaPost(payload, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.feed.all });
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.profile.all });
    },
  });
};

export const useCreateMomentMutation = () => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (input: {
      asset: ImagePickerAsset;
      caption?: string;
      diveSiteId?: string;
    }) => {
      const token = await getRequiredToken();
      const intent = await createMomentUploadIntent(
        {
          caption: input.caption || null,
          contentType: mimeTypeForAsset(input.asset),
          diveSiteId: input.diveSiteId || null,
          filename: filenameForAsset(input.asset, "moment"),
        },
        token,
      );
      await uploadMomentToDirectUrl(
        intent.uploadUrl,
        nativeFileFromAsset(input.asset, "moment"),
      );
      return completeMomentUpload(intent.postId, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.feed.all });
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.profile.all });
    },
  });
};

export const useSyncMomentStatusMutation = () => {
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (postId: string) =>
      syncMomentStatus(requirePostId(postId), await getRequiredToken()),
  });
};

export const useToggleMediaPostLikeMutation = (postId: string | undefined) => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (viewerHasLiked: boolean) => {
      const targetPostId = requirePostId(postId ?? "");
      const token = await getRequiredToken();
      return viewerHasLiked
        ? unlikeMediaPost(targetPostId, token)
        : likeMediaPost(targetPostId, token);
    },
    onSuccess: (response) => {
      if (!postId) return;
      queryClient.setQueryData<MediaPostDetailResponse>(
        mobileQueryKeys.media.postDetail(postId),
        (current) => patchMediaPostDetailLikeState(current, response),
      );
      queryClient.setQueriesData<ActivityFeedOrInfinite>(
        { queryKey: mobileQueryKeys.feed.all },
        (current) =>
          patchFeedMediaState(current, postId, {
            likeCount: response.likeCount,
            viewerHasLiked: response.viewerHasLiked,
          }),
      );
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.profile.all });
    },
  });
};

export const useToggleMediaPostSaveMutation = (postId: string | undefined) => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (viewerHasSaved: boolean) => {
      const targetPostId = requirePostId(postId ?? "");
      const token = await getRequiredToken();
      return viewerHasSaved
        ? unsaveMediaPost(targetPostId, token)
        : saveMediaPost(targetPostId, token);
    },
    onSuccess: (response) => {
      if (!postId) return;
      queryClient.setQueryData<MediaPostDetailResponse>(
        mobileQueryKeys.media.postDetail(postId),
        (current) => patchMediaPostDetailSaveState(current, response),
      );
      queryClient.setQueriesData<ActivityFeedOrInfinite>(
        { queryKey: mobileQueryKeys.feed.all },
        (current) =>
          patchFeedMediaState(current, postId, {
            viewerHasSaved: response.viewerHasSaved,
          }),
      );
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.profile.all });
    },
  });
};

export const useCreateMediaPostCommentMutation = (postId: string | undefined) => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (body: string) => {
      const targetPostId = requirePostId(postId ?? "");
      const token = await getRequiredToken();
      return createMediaPostComment(targetPostId, { body }, token);
    },
    onSuccess: (comment) => {
      if (!postId) return;
      const commentsRootKey = mobileQueryKeys.media.postCommentsRoot(postId);
      queryClient.setQueriesData<MediaPostCommentListResponse>(
        { queryKey: commentsRootKey },
        (current) =>
          patchCommentList(current, (items) => {
            if (items.some((item) => item.id === comment.id)) return items;
            return [comment, ...items];
          }),
      );
      queryClient.setQueriesData<ActivityFeedOrInfinite>({ queryKey: mobileQueryKeys.feed.all },
        (current) => patchFeedCommentCount(current, postId, 1),
      );
      queryClient.setQueryData<MediaPostDetailResponse>(
        mobileQueryKeys.media.postDetail(postId),
        (current) => patchMediaPostDetailCommentCount(current, 1),
      );
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.profile.all });
    },
  });
};

export const useDeleteMediaPostCommentMutation = (postId: string | undefined) => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation<unknown, Error, string, CommentMutationContext | undefined>({
    mutationFn: async (commentId: string) => {
      const targetPostId = requirePostId(postId ?? "");
      const token = await getRequiredToken();
      return deleteMediaPostComment(targetPostId, commentId, token);
    },
    onMutate: async (commentId) => {
      if (!postId) return undefined;

      const commentsKey = mobileQueryKeys.media.postCommentsRoot(postId);
      await queryClient.cancelQueries({ queryKey: commentsKey });
      const previousComments =
        queryClient.getQueriesData<MediaPostCommentListResponse>({
          queryKey: commentsKey,
        });

      queryClient.setQueriesData<MediaPostCommentListResponse>(
        { queryKey: commentsKey },
        (current) =>
          patchCommentList(current, (items) =>
            items.filter((comment) => comment.id !== commentId),
          ),
      );
      queryClient.setQueriesData<ActivityFeedOrInfinite>(
        { queryKey: mobileQueryKeys.feed.all },
        (current) => patchFeedCommentCount(current, postId, -1),
      );
      queryClient.setQueryData<MediaPostDetailResponse>(
        mobileQueryKeys.media.postDetail(postId),
        (current) => patchMediaPostDetailCommentCount(current, -1),
      );

      return { commentsKey, previousComments };
    },
    onSuccess: () => {
      if (!postId) return;
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.profile.all });
    },
    onError: (_error, _variables, context) => {
      for (const [cachedQueryKey, data] of context?.previousComments ?? []) {
        queryClient.setQueryData(cachedQueryKey, data);
      }
    },
  });
};

export const useToggleMediaPostCommentLikeMutation = (postId: string | undefined) => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation<MediaPostCommentLikeState, Error, MediaPostComment, CommentMutationContext | undefined>({
    mutationFn: async (comment) => {
      const targetPostId = requirePostId(postId ?? "");
      const token = await getRequiredToken();
      return comment.viewerHasLiked
        ? unlikeMediaPostComment(targetPostId, comment.id, token)
        : likeMediaPostComment(targetPostId, comment.id, token);
    },
    onMutate: async (comment) => {
      if (!postId) return undefined;

      const commentsKey = mobileQueryKeys.media.postCommentsRoot(postId);
      await queryClient.cancelQueries({ queryKey: commentsKey });
      const previousComments =
        queryClient.getQueriesData<MediaPostCommentListResponse>({
          queryKey: commentsKey,
        });

      queryClient.setQueriesData<MediaPostCommentListResponse>(
        { queryKey: commentsKey },
        (current) =>
          patchCommentList(current, (items) =>
            items.map((item) =>
              item.id === comment.id
                ? {
                    ...item,
                    viewerHasLiked: !item.viewerHasLiked,
                    likeCount: clampCount(item.likeCount + (item.viewerHasLiked ? -1 : 1)),
                  }
                : item,
            ),
          ),
      );

      return { commentsKey, previousComments };
    },
    onSuccess: (response) => {
      if (!postId) return;
      queryClient.setQueriesData<MediaPostCommentListResponse>(
        { queryKey: mobileQueryKeys.media.postCommentsRoot(postId) },
        (current) =>
          patchCommentList(current, (items) =>
            items.map((item) => patchCommentLikeState(item, response)),
          ),
      );
    },
    onError: (_error, _comment, context) => {
      for (const [cachedQueryKey, data] of context?.previousComments ?? []) {
        queryClient.setQueryData(cachedQueryKey, data);
      }
    },
  });
};
