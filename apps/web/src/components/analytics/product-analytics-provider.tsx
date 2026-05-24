"use client";

import { useEffect, useRef } from "react";

import { useSession } from "@/features/auth/session";
import { trackProductEvent } from "@/lib/analytics/product-events";

export function ProductAnalyticsProvider() {
  const session = useSession();
  const trackedSessionRef = useRef(false);

  useEffect(() => {
    if (trackedSessionRef.current || session.status !== "signed_in") {
      return;
    }
    trackedSessionRef.current = true;
    trackProductEvent("session_started");
  }, [session.status]);

  return null;
}
