import "server-only";

import type { BuddyFinderSharePreviewResponse } from "@freediving.ph/types";

import { fphgoFetchServer } from "@/lib/api/fphgo-fetch-server";
import { routes } from "@/lib/api/fphgo-routes";

export const getBuddyFinderSharePreviewServer = (id: string) =>
  fphgoFetchServer<BuddyFinderSharePreviewResponse>(routes.v1.buddyFinder.sharePreview(id));
