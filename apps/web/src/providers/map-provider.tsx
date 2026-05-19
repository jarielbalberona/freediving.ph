"use client";

import { APIProvider } from "@vis.gl/react-google-maps";
import { MapPinOff } from "lucide-react";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";

export function MapProvider({ children }: { children: ReactNode }) {
  const apiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAP_API;

  if (!apiKey) {
    const isDev = process.env.NODE_ENV === "development";

    return (
      <div className="flex h-full min-h-[420px] items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md border-border/80 bg-card/95 p-5 text-center shadow-xl">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
            <MapPinOff className="size-5 text-muted-foreground" />
          </div>
          <p className="mt-4 text-base font-semibold text-foreground">
            Map temporarily unavailable
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            You can still browse dive spots from the list. Open a site page to
            check details before planning a dive.
          </p>
          {isDev ? (
            <p className="mt-3 rounded-2xl bg-muted px-3 py-2 text-xs text-muted-foreground">
              Dev setup: set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY or
              NEXT_PUBLIC_GOOGLE_MAP_API.
            </p>
          ) : null}
        </Card>
      </div>
    );
  }

  return <APIProvider apiKey={apiKey}>{children}</APIProvider>;
}
