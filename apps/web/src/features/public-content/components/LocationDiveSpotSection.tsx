import Link from "next/link";
import React from "react";

import type { PublicLocationContent } from "@/features/public-content/content/locations";
import {
  exploreHrefForLocation,
  type PublicLocationDiveSpot,
} from "@/features/public-content/lib/locationDiveSpots";

export function LocationDiveSpotSection({
  location,
  spots,
}: {
  location: PublicLocationContent;
  spots: PublicLocationDiveSpot[];
}) {
  const exploreHref = exploreHrefForLocation(location);

  return (
    <section className="border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="space-y-3">
            <h2 className="text-xl font-semibold tracking-normal text-foreground">
              Community dive spots
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              These come from approved public Explore listings when available.
              Always confirm current conditions with local guidance before
              diving.
            </p>
            <Link
              href={exploreHref}
              className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {location.exploreQuery?.label ?? "Explore dive spots"}
            </Link>
          </div>

          {spots.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {spots.map((spot) => (
                <DiveSpotSummaryCard key={spot.slug} spot={spot} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-muted/20 p-5">
              <h3 className="text-base font-semibold tracking-normal text-foreground">
                No approved dive spots listed here yet
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Explore nearby spots, ask local schools or groups for current
                guidance, or help the community by contributing places you have
                safely visited with a trained buddy.
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                <Link
                  href={exploreHref}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Search Explore
                </Link>
                <Link
                  href="/explore/submit"
                  className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Contribute a dive spot
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function DiveSpotSummaryCard({ spot }: { spot: PublicLocationDiveSpot }) {
  const depth = depthLabel(spot);
  const hazards = spot.hazards.slice(0, 2);

  return (
    <Link
      href={`/explore/sites/${encodeURIComponent(spot.slug)}`}
      className="rounded-lg border border-border p-4 hover:bg-muted/50"
    >
      <div className="space-y-2">
        <div>
          <h3 className="text-base font-semibold tracking-normal text-foreground">
            {spot.name}
          </h3>
          <p className="text-sm text-muted-foreground">{spot.area}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="rounded-full border border-border px-2 py-1">
            {difficultyLabel(spot.difficulty)}
          </span>
          <span className="rounded-full border border-border px-2 py-1">
            {verificationLabel(spot.verificationStatus)}
          </span>
          {depth ? (
            <span className="rounded-full border border-border px-2 py-1">
              {depth}
            </span>
          ) : null}
        </div>
        {spot.lastConditionSummary ? (
          <p className="text-sm leading-6 text-muted-foreground">
            {spot.lastConditionSummary}
          </p>
        ) : null}
        {hazards.length > 0 ? (
          <p className="text-xs leading-5 text-muted-foreground">
            Notes: {hazards.join(", ")}
            {spot.hazards.length > hazards.length ? " +" : ""}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

function difficultyLabel(value: PublicLocationDiveSpot["difficulty"]): string {
  switch (value) {
    case "easy":
      return "Beginner-aware";
    case "moderate":
      return "Moderate";
    case "hard":
      return "Experienced";
  }
}

function verificationLabel(
  value: PublicLocationDiveSpot["verificationStatus"],
): string {
  switch (value) {
    case "verified":
      return "Verified";
    case "moderator":
      return "Checked by team";
    case "instructor":
      return "Instructor noted";
    case "community":
    default:
      return "Community shared";
  }
}

function depthLabel(spot: PublicLocationDiveSpot): string | null {
  const hasMin = typeof spot.depthMinM === "number";
  const hasMax = typeof spot.depthMaxM === "number";
  if (hasMin && hasMax) return `${spot.depthMinM}m-${spot.depthMaxM}m`;
  if (hasMin) return `From ${spot.depthMinM}m`;
  if (hasMax) return `Up to ${spot.depthMaxM}m`;
  return null;
}
