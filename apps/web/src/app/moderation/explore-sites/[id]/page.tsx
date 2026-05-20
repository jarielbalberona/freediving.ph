"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { APIProvider, AdvancedMarker, Map } from "@vis.gl/react-google-maps";
import { ExternalLink, MapPin, MapPinOff } from "lucide-react";
import { useState } from "react";

import { AuthGuard, RequirePermission } from "@/components/auth/guard";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { exploreApi } from "@/features/diveSpots/api/explore-v1";
import { getApiErrorMessage } from "@/lib/http/api-error";

const MODERATION_GOOGLE_MAP_ID =
  process.env.NEXT_PUBLIC_GOOGLE_MAP_ID ?? "c5170fc5a137d9ea8ef77423";

export default function ModerationExploreSiteDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = String(params.id ?? "");
  const [reason, setReason] = useState("");

  const detailQuery = useQuery({
    queryKey: ["moderation-explore-site", id],
    enabled: id.length > 0,
    queryFn: async () => (await exploreApi.getModerationSiteById(id)).submission,
  });

  const approveMutation = useMutation({
    mutationFn: () =>
      exploreApi.approveSite(id, { reason: reason.trim() || undefined }),
    onSuccess: () => router.push("/moderation/explore-sites"),
  });

  const rejectMutation = useMutation({
    mutationFn: () =>
      exploreApi.rejectSite(id, { reason: reason.trim() || undefined }),
    onSuccess: () => router.push("/moderation/explore-sites"),
  });

  const item = detailQuery.data;
  const actionError = approveMutation.error ?? rejectMutation.error;

  return (
    <AuthGuard
      requiredRole="MODERATOR"
      title="Moderator access required"
      description="Only moderators can review dive site submissions."
    >
      <RequirePermission
        perm="explore.moderate"
        title="Missing explore.moderate permission"
        description="Your account cannot review dive site submissions."
      >
        <div className="container mx-auto max-w-4xl p-6">
          <div className="mb-6 flex items-center justify-between">
            <Link
              href="/moderation/explore-sites"
              className={buttonVariants({ variant: "outline" })}
            >
              Back to pending list
            </Link>
          </div>

          {detailQuery.error ? (
            <p className="text-sm text-red-600">
              {getApiErrorMessage(
                detailQuery.error,
                "Failed to load site submission",
              )}
            </p>
          ) : null}

          {item ? (
            <div className="grid gap-5">
              <Card>
                <CardHeader>
                  <CardTitle>{item.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{item.area}</p>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm">
                  <SubmissionField
                    label="Description"
                    value={item.description || "Not provided"}
                  />
                  <SubmissionField label="Difficulty" value={item.difficulty} />
                  <SubmissionField
                    label="Hazards"
                    value={
                      item.hazards.length > 0
                        ? item.hazards.join(", ")
                        : "None listed"
                    }
                  />
                  <SubmissionField
                    label="Best season"
                    value={item.bestSeason || "Not provided"}
                  />
                  <SubmissionField
                    label="Typical conditions"
                    value={item.typicalConditions || "Not provided"}
                  />
                  <SubmissionField
                    label="Access"
                    value={item.access || "Not provided"}
                  />
                  <SubmissionField
                    label="Fees"
                    value={item.fees || "Not provided"}
                  />
                </CardContent>
              </Card>

              <SubmissionLocationMap
                name={item.name}
                area={item.area}
                latitude={item.latitude}
                longitude={item.longitude}
              />

              <Card>
                <CardHeader>
                  <CardTitle>Moderation action</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="moderation-reason">Moderator note</Label>
                    <Textarea
                      id="moderation-reason"
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                    />
                  </div>

                  {actionError ? (
                    <p className="text-sm text-red-600">
                      {getApiErrorMessage(
                        actionError,
                        "Failed to apply moderation action",
                      )}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap gap-3">
                    <Button
                      className="rounded-full"
                      disabled={
                        approveMutation.isPending || rejectMutation.isPending
                      }
                      onClick={() => approveMutation.mutate()}
                    >
                      {approveMutation.isPending
                        ? "Approving..."
                        : "Approve site"}
                    </Button>
                    <Button
                      variant="destructive"
                      className="rounded-full"
                      disabled={
                        approveMutation.isPending || rejectMutation.isPending
                      }
                      onClick={() => rejectMutation.mutate()}
                    >
                      {rejectMutation.isPending
                        ? "Rejecting..."
                        : "Reject site"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>
      </RequirePermission>
    </AuthGuard>
  );
}

function SubmissionField({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="font-medium">{label}:</span> {value}
    </p>
  );
}

function SubmissionLocationMap({
  name,
  area,
  latitude,
  longitude,
}: {
  name: string;
  area: string;
  latitude?: number;
  longitude?: number;
}) {
  const hasCoordinates =
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    typeof longitude === "number" &&
    Number.isFinite(longitude);
  const apiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAP_API;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Submitted location</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {hasCoordinates
                ? `${formatCoordinate(latitude)}, ${formatCoordinate(longitude)}`
                : "No coordinates were submitted"}
            </p>
          </div>
          {hasCoordinates ? (
            <a
              href={googleMapsUrl(latitude, longitude)}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <ExternalLink className="size-4" />
              Open in Google Maps
            </a>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {hasCoordinates && apiKey ? (
          <div className="relative h-[360px] overflow-hidden rounded-lg border bg-muted">
            <APIProvider apiKey={apiKey}>
              <Map
                id="moderation-submitted-site-map"
                mapId={MODERATION_GOOGLE_MAP_ID}
                defaultCenter={{ lat: latitude, lng: longitude }}
                defaultZoom={15}
                gestureHandling="greedy"
                mapTypeControl
                streetViewControl={false}
                fullscreenControl
                clickableIcons={false}
                reuseMaps
                className="h-full w-full"
              >
                <AdvancedMarker
                  position={{ lat: latitude, lng: longitude }}
                  title={`${name} - ${area}`}
                >
                  <div className="grid size-11 place-items-center rounded-full border-2 border-white bg-sky-600 text-white shadow-lg">
                    <MapPin className="size-6" />
                  </div>
                </AdvancedMarker>
              </Map>
            </APIProvider>
          </div>
        ) : (
          <div className="flex h-[240px] items-center justify-center rounded-lg border bg-muted/40 p-6 text-center">
            <div>
              <MapPinOff className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">
                {hasCoordinates
                  ? "Map temporarily unavailable"
                  : "No submitted pin"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {hasCoordinates
                  ? "Use the coordinate link above to inspect this pin."
                  : "Reject or ask the submitter for a map pin before approval."}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatCoordinate(value: number) {
  return value.toFixed(6);
}

function googleMapsUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}
