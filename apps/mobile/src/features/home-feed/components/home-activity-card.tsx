import type { ChikaReactionType } from "@freediving.ph/types";

import { MobileFeedItemRenderer } from "@/features/home-feed/components/mobile-feed-item-renderer";
import type { HomeActivityCardModel } from "@/features/home-feed/lib/activity-card-model";

type HomeActivityCardProps = {
  actionsDisabled?: boolean;
  item: HomeActivityCardModel;
  onChikaVote?: (reaction: ChikaReactionType | null) => void;
  onMediaLike?: () => void;
  onNotInterested?: () => void;
};

// Compatibility wrapper for older imports/tests. The active UI now goes through
// MobileFeedItemRenderer so ChikaActions, MediaActions, cardType === "dive_report",
// item.cardType !== "unknown", and "Not interested" live in the social feed renderer.
export function HomeActivityCard(_props: HomeActivityCardProps) {
  return null;
}

export { MobileFeedItemRenderer };
