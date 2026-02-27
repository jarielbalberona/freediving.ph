import { fphgoFetchClient } from "@/lib/api/fphgo-fetch";
import { routes } from "@/lib/api/fphgo-routes";

type BlockedUser = {
  blockedUserId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  createdAt: string;
};

type ListBlocksResponse = {
  items: BlockedUser[];
  nextCursor?: string;
};

export const blocksApi = {
  list: async (limit = 20, cursor?: string): Promise<ListBlocksResponse> => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set("cursor", cursor);
    return fphgoFetchClient<ListBlocksResponse>(`${routes.v1.blocks.list()}?${params.toString()}`);
  },

  block: async (blockedUserId: string): Promise<void> => {
    await fphgoFetchClient<{ ok: boolean }>(routes.v1.blocks.create(), {
      method: "POST",
      body: { blockedUserId },
    });
  },

  unblock: async (blockedUserId: string): Promise<void> => {
    await fphgoFetchClient<void>(routes.v1.blocks.byUserId(blockedUserId), {
      method: "DELETE",
    });
  },
};

export type { BlockedUser, ListBlocksResponse };
