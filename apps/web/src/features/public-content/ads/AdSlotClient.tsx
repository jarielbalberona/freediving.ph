"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

import { isAdsenseAllowedPath } from "@/features/public-content/ads/adsenseRoutes";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, never>>;
  }
}

type AdSlotClientProps = {
  publisherId: string;
  slot: string;
  format: string;
  responsive: boolean;
  className?: string;
  style?: CSSProperties;
  label: string;
  ariaLabel: string;
  reservedHeight: number;
  testMode: boolean;
};

export function AdSlotClient({
  publisherId,
  slot,
  format,
  responsive,
  className,
  style,
  label,
  ariaLabel,
  reservedHeight,
  testMode,
}: AdSlotClientProps) {
  const pathname = usePathname();
  const pushedRef = useRef(false);
  const canRender = isAdsenseAllowedPath(pathname ?? "");

  useEffect(() => {
    if (!canRender || pushedRef.current) return;

    try {
      window.adsbygoogle = window.adsbygoogle ?? [];
      window.adsbygoogle.push({});
      pushedRef.current = true;
    } catch {
      // AdSense can throw during duplicate render timing; ad availability must
      // never break public content rendering.
    }
  }, [canRender]);

  if (!canRender) return null;

  return (
    <section
      aria-label={ariaLabel}
      className={cn(
        "mx-auto w-full max-w-3xl border-y border-border bg-muted/20 px-4 py-4",
        className,
      )}
      style={{ minHeight: reservedHeight, ...style }}
    >
      <p className="mb-3 text-center text-xs uppercase tracking-normal text-muted-foreground">
        {label}
      </p>
      <ins
        className="adsbygoogle block"
        style={{ display: "block" }}
        data-ad-client={publisherId}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? "true" : "false"}
        data-adtest={testMode ? "on" : undefined}
      />
    </section>
  );
}
