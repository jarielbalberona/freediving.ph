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
  },
} as const;

