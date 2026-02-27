const toPathId = (id: string | number): string => encodeURIComponent(String(id));

export const routes = {
  v1: {
    me: () => "/v1/auth/session",
    messages: {
      inbox: () => "/v1/messages/inbox",
      requests: () => "/v1/messages/requests",
      send: () => "/v1/messages/send",
      accept: (conversationId: string | number) =>
        `/v1/messages/${toPathId(conversationId)}/accept`,
      reject: (conversationId: string | number) =>
        `/v1/messages/${toPathId(conversationId)}/reject`,
    },
    chika: {
      threads: {
        list: () => "/v1/chika/threads",
        byId: (id: string | number) => `/v1/chika/threads/${toPathId(id)}`,
        reactions: (id: string | number) =>
          `/v1/chika/threads/${toPathId(id)}/reactions`,
        comments: (id: string | number) =>
          `/v1/chika/threads/${toPathId(id)}/comments`,
      },
    },
    profiles: {
      me: () => "/v1/me/profile",
      byUserId: (userId: string | number) => `/v1/profiles/${toPathId(userId)}`,
      searchUsers: () => "/v1/users/search",
    },
    blocks: {
      list: () => "/v1/blocks",
      create: () => "/v1/blocks",
      byUserId: (blockedUserId: string | number) => `/v1/blocks/${toPathId(blockedUserId)}`,
    },
    reports: {
      create: () => "/v1/reports",
      list: () => "/v1/reports",
      byId: (reportId: string | number) => `/v1/reports/${toPathId(reportId)}`,
      status: (reportId: string | number) => `/v1/reports/${toPathId(reportId)}/status`,
    },
    moderation: {
      users: {
        suspend: (appUserId: string | number) => `/v1/moderation/users/${toPathId(appUserId)}/suspend`,
        unsuspend: (appUserId: string | number) => `/v1/moderation/users/${toPathId(appUserId)}/unsuspend`,
        readOnly: (appUserId: string | number) => `/v1/moderation/users/${toPathId(appUserId)}/read-only`,
        clearReadOnly: (appUserId: string | number) => `/v1/moderation/users/${toPathId(appUserId)}/read-only/clear`,
      },
      chika: {
        threads: {
          hide: (threadId: string | number) => `/v1/moderation/chika/threads/${toPathId(threadId)}/hide`,
          unhide: (threadId: string | number) => `/v1/moderation/chika/threads/${toPathId(threadId)}/unhide`,
        },
        comments: {
          hide: (commentId: string | number) => `/v1/moderation/chika/comments/${toPathId(commentId)}/hide`,
          unhide: (commentId: string | number) => `/v1/moderation/chika/comments/${toPathId(commentId)}/unhide`,
        },
      },
    },
  },
} as const;
