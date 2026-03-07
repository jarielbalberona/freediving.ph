const toPathId = (id: string | number): string => encodeURIComponent(String(id));

export const routes = {
  v1: {
    me: () => "/v1/auth/session",
    messages: {
      threads: () => "/v1/messages/threads",
      threadById: (threadId: string | number) => `/v1/messages/threads/${toPathId(threadId)}`,
      threadMessages: (threadId: string | number) => `/v1/messages/threads/${toPathId(threadId)}/messages`,
      threadRead: (threadId: string | number) => `/v1/messages/threads/${toPathId(threadId)}/read`,
      threadCategory: (threadId: string | number) => `/v1/messages/threads/${toPathId(threadId)}/category`,
      directThread: () => "/v1/messages/threads/direct",
    },
    chika: {
      categories: () => "/v1/chika/categories",
      threads: {
        list: () => "/v1/chika/threads",
        byId: (id: string | number) => `/v1/chika/threads/${toPathId(id)}`,
        reactions: (id: string | number) =>
          `/v1/chika/threads/${toPathId(id)}/reactions`,
        comments: (id: string | number) =>
          `/v1/chika/threads/${toPathId(id)}/comments`,
      },
      comments: {
        reactions: (id: string | number) =>
          `/v1/chika/comments/${toPathId(id)}/reactions`,
      },
    },
    profiles: {
      me: () => "/v1/me/profile",
      saved: () => "/v1/me/saved",
      byUserId: (userId: string | number) => `/v1/profiles/${toPathId(userId)}`,
      publicByUsername: (username: string | number) => `/v1/profiles/by-username/${toPathId(username)}`,
      publicPostsByUsername: (username: string | number) => `/v1/profiles/by-username/${toPathId(username)}/posts`,
      publicBucketListByUsername: (username: string | number) => `/v1/profiles/by-username/${toPathId(username)}/bucketlist`,
      searchUsers: () => "/v1/users/search",
      saveUser: (userId: string | number) => `/v1/users/id/${toPathId(userId)}/save`,
    },
    explore: {
      listSites: () => "/v1/explore/sites",
      latestUpdates: () => "/v1/explore/updates",
      submitSite: () => "/v1/explore/sites/submit",
      mySubmissions: () => "/v1/explore/sites/submissions",
      mySubmissionById: (id: string | number) => `/v1/explore/sites/submissions/${toPathId(id)}`,
      siteBySlug: (slug: string | number) => `/v1/explore/sites/${toPathId(slug)}`,
      siteBuddyPreview: (slug: string | number) => `/v1/explore/sites/${toPathId(slug)}/buddy-preview`,
      siteBuddyIntents: (slug: string | number) => `/v1/explore/sites/${toPathId(slug)}/buddy-intents`,
      saveSite: (siteId: string | number) => `/v1/explore/sites/${toPathId(siteId)}/save`,
      createUpdate: (siteId: string | number) => `/v1/explore/sites/${toPathId(siteId)}/updates`,
      moderationPendingSites: () => "/v1/explore/moderation/sites/pending",
      moderationSiteById: (id: string | number) => `/v1/explore/moderation/sites/${toPathId(id)}`,
      approveSite: (id: string | number) => `/v1/explore/moderation/sites/${toPathId(id)}/approve`,
      rejectSite: (id: string | number) => `/v1/explore/moderation/sites/${toPathId(id)}/reject`,
    },
    buddyFinder: {
      preview: () => "/v1/buddy-finder/preview",
      intents: () => "/v1/buddy-finder/intents",
      byId: (id: string | number) => `/v1/buddy-finder/intents/${toPathId(id)}`,
      message: (id: string | number) => `/v1/buddy-finder/intents/${toPathId(id)}/message`,
      sharePreview: (id: string | number) => `/v1/buddy-finder/intents/${toPathId(id)}/share-preview`,
    },
    feed: {
      home: () => "/v1/feed/home",
      impressions: () => "/v1/feed/impressions",
      actions: () => "/v1/feed/actions",
    },
    locations: {
      regions: () => "/v1/locations/regions",
      provinces: () => "/v1/locations/provinces",
      citiesMunicipalities: () => "/v1/locations/cities-municipalities",
      barangays: () => "/v1/locations/barangays",
    },
    blocks: {
      list: () => "/v1/blocks",
      create: () => "/v1/blocks",
      byUserId: (blockedUserId: string | number) => `/v1/blocks/${toPathId(blockedUserId)}`,
    },
    buddies: {
      list: () => "/v1/buddies",
      createRequest: () => "/v1/buddies/requests",
      incomingRequests: () => "/v1/buddies/requests/incoming",
      outgoingRequests: () => "/v1/buddies/requests/outgoing",
      acceptRequest: (requestId: string | number) => `/v1/buddies/requests/${toPathId(requestId)}/accept`,
      declineRequest: (requestId: string | number) => `/v1/buddies/requests/${toPathId(requestId)}/decline`,
      cancelRequest: (requestId: string | number) => `/v1/buddies/requests/${toPathId(requestId)}`,
      byUserId: (buddyUserId: string | number) => `/v1/buddies/${toPathId(buddyUserId)}`,
      preview: (userId: string | number) => `/v1/buddies/preview/${toPathId(userId)}`,
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
    media: {
      upload: () => "/v1/media/upload",
      uploadMultiple: () => "/v1/media/upload-multiple",
      mine: () => "/v1/media/mine",
      urls: () => "/v1/media/urls",
    },
    users: {
      byUsername: (username: string | number) => `/v1/users/${toPathId(username)}`,
    },
  },
} as const;
