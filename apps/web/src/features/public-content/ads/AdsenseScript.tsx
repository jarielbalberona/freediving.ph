"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

import { isAdsenseAllowedPath } from "@/features/public-content/ads/adsenseRoutes";

export function AdsenseScript({ publisherId }: { publisherId: string }) {
  const pathname = usePathname();

  if (!publisherId || !isAdsenseAllowedPath(pathname ?? "")) {
    return null;
  }

  return (
    <Script
      id="google-adsense"
      async
      strategy="afterInteractive"
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(publisherId)}`}
    />
  );
}
