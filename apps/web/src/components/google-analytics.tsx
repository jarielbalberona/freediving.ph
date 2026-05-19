"use client";

import { Suspense, useEffect } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const gtmId = process.env.NEXT_PUBLIC_GTM_ID?.trim();
const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();

const pagePathFrom = (
  pathname: string,
  searchParams: URLSearchParams,
): string => {
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
};

function GoogleAnalyticsRouteEvents({
  mode,
  measurementId,
}: {
  mode: "gtm" | "ga4";
  measurementId?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const pagePath = pagePathFrom(pathname, searchParams);
    if (mode === "gtm") {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: "next_route_change",
        page_path: pagePath,
      });
      return;
    }

    if (measurementId && typeof window.gtag === "function") {
      window.gtag("config", measurementId, {
        page_path: pagePath,
      });
    }
  }, [measurementId, mode, pathname, searchParams]);

  return null;
}

export function GoogleAnalytics() {
  if (gtmId) {
    return (
      <>
        <Script id="google-tag-manager" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
          `}
        </Script>
        <Script
          src={`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`}
          strategy="afterInteractive"
        />
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(gtmId)}`}
            height="0"
            width="0"
            title="Google Tag Manager"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <Suspense fallback={null}>
          <GoogleAnalyticsRouteEvents mode="gtm" />
        </Suspense>
      </>
    );
  }

  if (gaMeasurementId) {
    return (
      <>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaMeasurementId)}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaMeasurementId}', { send_page_view: false });
          `}
        </Script>
        <Suspense fallback={null}>
          <GoogleAnalyticsRouteEvents
            mode="ga4"
            measurementId={gaMeasurementId}
          />
        </Suspense>
      </>
    );
  }

  return null;
}
