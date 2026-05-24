import type { CSSProperties } from "react";

import { AdSlotClient } from "@/features/public-content/ads/AdSlotClient";
import {
  getAdsenseConfig,
  isAdsenseReady,
} from "@/features/public-content/ads/adsense.config";

type AdSlotProps = {
  slot?: string;
  format?: string;
  responsive?: boolean;
  className?: string;
  style?: CSSProperties;
  label?: string;
  ariaLabel?: string;
  reservedHeight?: number;
};

export function AdSlot({
  slot,
  format = "auto",
  responsive = true,
  className,
  style,
  label = "Advertisement",
  ariaLabel = "Advertisement",
  reservedHeight = 280,
}: AdSlotProps) {
  const config = getAdsenseConfig();
  const adSlot = slot?.trim() || config.defaultSlotId;

  if (!isAdsenseReady(config) || adSlot.length === 0) return null;

  return (
    <AdSlotClient
      publisherId={config.publisherId}
      slot={adSlot}
      format={format}
      responsive={responsive}
      className={className}
      style={style}
      label={label}
      ariaLabel={ariaLabel}
      reservedHeight={reservedHeight}
      testMode={config.testMode}
    />
  );
}
