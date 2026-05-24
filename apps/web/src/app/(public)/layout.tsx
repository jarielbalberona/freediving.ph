import type { ReactNode } from "react";

import {
  AdsenseScript,
  getAdsenseConfig,
  isAdsenseReady,
} from "@/features/public-content/ads";

export default function PublicRouteGroupLayout({
  children,
}: {
  children: ReactNode;
}) {
  const adsenseConfig = getAdsenseConfig();

  return (
    <>
      {isAdsenseReady(adsenseConfig) ? (
        <AdsenseScript publisherId={adsenseConfig.publisherId} />
      ) : null}
      {children}
    </>
  );
}
