import type { ActivityFeedItem, ChikaReactionType } from "@freediving.ph/types";

import {
  MobileBuddySignalFeedItem,
  MobileChikaFeedItem,
  MobileDiveReportFeedItem,
  MobileEventFeedItem,
  MobileMediaFeedItem,
  MobileUnknownFeedItem,
} from "@/features/home-feed/components/mobile-feed-items";
import {
  type HomeActivityCardModel,
  toHomeActivityCardModel,
} from "@/features/home-feed/lib/activity-card-model";

export type MobileFeedItemRendererProps = {
  actionsDisabled?: boolean;
  item: ActivityFeedItem;
  onChikaVote?: (
    item: ActivityFeedItem,
    card: HomeActivityCardModel,
    reaction: ChikaReactionType | null,
  ) => void;
  onMediaLike?: (item: ActivityFeedItem, card: HomeActivityCardModel) => void;
  onNotInterested?: (item: ActivityFeedItem, card: HomeActivityCardModel) => void;
  videoActive?: boolean;
};

export function MobileFeedItemRenderer({
  actionsDisabled = false,
  item,
  onChikaVote,
  onMediaLike,
  onNotInterested,
  videoActive = false,
}: MobileFeedItemRendererProps) {
  const card = toHomeActivityCardModel(item);
  const commonProps = {
    actionsDisabled,
    item: card,
    onNotInterested: onNotInterested
      ? () => onNotInterested(item, card)
      : undefined,
  };

  switch (card.cardType) {
    case "media_post":
      return (
        <MobileMediaFeedItem
          {...commonProps}
          videoActive={videoActive}
          onMediaLike={
            onMediaLike ? () => onMediaLike(item, card) : undefined
          }
        />
      );
    case "chika":
      return (
        <MobileChikaFeedItem
          {...commonProps}
          onChikaVote={(reaction) => onChikaVote?.(item, card, reaction)}
        />
      );
    case "event":
      return <MobileEventFeedItem {...commonProps} />;
    case "dive_report":
      return <MobileDiveReportFeedItem {...commonProps} />;
    case "buddy_signal":
      return <MobileBuddySignalFeedItem {...commonProps} />;
    case "unknown":
    default:
      return <MobileUnknownFeedItem {...commonProps} />;
  }
}
