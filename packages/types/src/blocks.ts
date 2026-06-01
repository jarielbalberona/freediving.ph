export interface BlockedUser {
  blockedUserId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  createdAt: string;
}

export interface CreateBlockRequest {
  blockedUserId: string;
}

export interface CreateBlockResponse {
  ok: boolean;
}

export interface ListBlocksResponse {
  items: BlockedUser[];
  nextCursor?: string;
}
