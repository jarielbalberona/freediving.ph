"use client";

import * as React from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { MapPin, MessageSquare, Star, Waves } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useCreateDiveSpotReview, useDiveSpot, useDiveSpotReviewSummary, useDiveSpotReviews } from "@/features/diveSpots";
import { diveSpotReviewSchema, type DiveSpotReviewValues } from "@/features/diveSpots/schemas/review.schema";
import { axiosInstance } from "@/lib/http/axios";

type DiveSpotDetailSheetProps = {
  spotId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function DiveSpotDetailSheet({ spotId, open, onOpenChange }: DiveSpotDetailSheetProps) {
  const parseQueryError = (error: unknown) => {
    if (typeof error === "object" && error !== null && "response" in error) {
      const response = (error as { response?: { status?: number } }).response;
      if (response?.status === 401) return "Create an account to view this section.";
      if (response?.status === 403) return "You do not have access to this section.";
      if (response?.status === 404) return "No linked data found.";
    }
    return "Unable to load data.";
  };

  const { isSignedIn } = useUser();
  const { data, isLoading, isError } = useDiveSpot(spotId ?? 0);
  const { data: reviewSummary } = useDiveSpotReviewSummary(spotId ?? 0);
  const { data: reviews = [], isLoading: isReviewsLoading } = useDiveSpotReviews(spotId ?? 0);
  const createReview = useCreateDiveSpotReview();
  const {
    data: relatedEvents = [],
    isLoading: isRelatedEventsLoading,
    isError: isRelatedEventsError,
    error: relatedEventsError,
  } = useQuery({
    queryKey: ["dive-spot-related-events", spotId],
    queryFn: async () => {
      const response = await axiosInstance.get(`/events?diveSpotId=${spotId}&limit=5&offset=0`);
      return Array.isArray(response.data?.data) ? response.data.data : [];
    },
    enabled: open && !!spotId,
    staleTime: 60 * 1000,
  });
  const {
    data: relatedBuddies = [],
    isLoading: isRelatedBuddiesLoading,
    isError: isRelatedBuddiesError,
    error: relatedBuddiesError,
  } = useQuery({
    queryKey: ["dive-spot-related-buddies", spotId],
    queryFn: async () => {
      const response = await axiosInstance.get(`/buddies/available?diveSpotId=${spotId}&limit=5&offset=0`);
      return Array.isArray(response.data?.data) ? response.data.data : [];
    },
    enabled: open && !!spotId && isSignedIn,
    staleTime: 60 * 1000,
    retry: false,
  });
  const {
    data: relatedRecords = [],
    isLoading: isRelatedRecordsLoading,
    isError: isRelatedRecordsError,
    error: relatedRecordsError,
  } = useQuery({
    queryKey: ["dive-spot-related-records", spotId],
    queryFn: async () => {
      const response = await axiosInstance.get(`/records?diveSpotId=${spotId}&limit=5&offset=0`);
      return Array.isArray(response.data?.data) ? response.data.data : [];
    },
    enabled: open && !!spotId,
    staleTime: 60 * 1000,
  });

  const form = useForm<DiveSpotReviewValues>({
    resolver: zodResolver(diveSpotReviewSchema),
    defaultValues: { rating: 5, comment: "" },
  });

  React.useEffect(() => {
    if (!open) {
      form.reset({ rating: 5, comment: "" });
    }
  }, [open, form]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Dive Spot Details</SheetTitle>
          <SheetDescription>Overview, logistics, and community sentiment for this spot.</SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-4 px-4 pb-8">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : null}

        {!isLoading && isError ? (
          <div className="px-4 pb-8 text-sm text-destructive">Unable to load this dive spot right now.</div>
        ) : null}

        {!isLoading && !isError && !data ? (
          <div className="px-4 pb-8 text-sm text-muted-foreground">Dive spot not found.</div>
        ) : null}

        {!isLoading && !isError && data ? (
          <div className="space-y-5 px-4 pb-8">
            <div>
              <h2 className="text-lg font-semibold">{data.name}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline">{data.difficulty ?? "BEGINNER"}</Badge>
                {typeof data.depth === "number" ? (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Waves className="h-3.5 w-3.5" /> {data.depth}m depth
                  </span>
                ) : null}
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <p className="inline-flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {data.locationName ?? "Unknown location"}
              </p>
              <p className="inline-flex items-center gap-2 text-muted-foreground">
                <Star className="h-4 w-4 text-amber-500" />
                {(reviewSummary?.avgRating ?? data.avgRating ?? 0).toFixed(1)} avg from{" "}
                {reviewSummary?.ratingCount ?? data.ratingCount ?? 0} ratings
              </p>
              <p className="inline-flex items-center gap-2 text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                {reviewSummary?.commentCount ?? data.commentCount ?? 0} comments
              </p>
            </div>

            {data.description ? (
              <section className="space-y-1">
                <h3 className="text-sm font-semibold">Overview</h3>
                <p className="text-sm text-muted-foreground">{data.description}</p>
              </section>
            ) : null}

            {data.directions ? (
              <section className="space-y-1">
                <h3 className="text-sm font-semibold">Directions</h3>
                <p className="text-sm text-muted-foreground">{data.directions}</p>
              </section>
            ) : null}

            <section className="space-y-3 border-t pt-4">
              <h3 className="text-sm font-semibold">Reviews</h3>

              {isSignedIn ? (
                <Form {...form}>
                  <form
                    className="space-y-2 rounded-md border p-3"
                    onSubmit={form.handleSubmit((values) => {
                      if (!spotId) return;
                      createReview.mutate({
                        diveSpotId: spotId,
                        data: {
                          rating: values.rating,
                          comment: values.comment?.trim() || undefined,
                        },
                      });
                      form.reset({ rating: 5, comment: "" });
                    })}
                  >
                    <FormField
                      control={form.control}
                      name="rating"
                      render={({ field }) => (
                        <FormItem>
                          <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                            <FormLabel className="text-xs text-muted-foreground">
                              Rating (1-5)
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                max={5}
                                value={field.value}
                                onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="comment"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea
                              placeholder="Share what divers should know about this spot."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      size="sm"
                      type="submit"
                      disabled={form.formState.isSubmitting || createReview.isPending}
                    >
                      {form.formState.isSubmitting || createReview.isPending ? "Saving..." : "Submit review"}
                    </Button>
                  </form>
                </Form>
              ) : null}

              {isReviewsLoading ? (
                <div className="text-sm text-muted-foreground">Loading reviews...</div>
              ) : reviews.length === 0 ? (
                <div className="text-sm text-muted-foreground">No reviews yet.</div>
              ) : (
                <div className="space-y-2">
                  {reviews.map((review) => (
                    <article key={review.id} className="rounded-md border p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{review.userAlias || review.userName || `Diver #${review.userId}`}</p>
                        <p className="text-xs text-muted-foreground">{review.rating}/5</p>
                      </div>
                      {review.comment ? <p className="mt-1 text-sm text-muted-foreground">{review.comment}</p> : null}
                    </article>
                  ))}
                </div>
              )}
            </section>

            {isSignedIn ? (
            <section className="space-y-2 border-t pt-4">
              <h3 className="text-sm font-semibold">Buddies Available Nearby</h3>
              {isRelatedBuddiesLoading ? (
                <p className="text-sm text-muted-foreground">Loading buddy availability...</p>
              ) : isRelatedBuddiesError ? (
                <p className="text-sm text-muted-foreground">{parseQueryError(relatedBuddiesError)}</p>
              ) : relatedBuddies.length === 0 ? (
                <p className="text-sm text-muted-foreground">No buddy availability data for this spot yet.</p>
              ) : (
                <div className="space-y-2">
                  {relatedBuddies.map((buddy: any) => (
                    <div key={buddy.id} className="rounded-md border p-3 text-sm">
                      <p className="font-medium">{buddy.alias || buddy.username || `Diver #${buddy.id}`}</p>
                      <p className="text-xs text-muted-foreground">{buddy.homeDiveArea || buddy.location || "No location shared"}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
            ) : null}

            <section className="space-y-2 border-t pt-4">
              <h3 className="text-sm font-semibold">Upcoming Events</h3>
              {isRelatedEventsLoading ? (
                <p className="text-sm text-muted-foreground">Loading related events...</p>
              ) : isRelatedEventsError ? (
                <p className="text-sm text-muted-foreground">{parseQueryError(relatedEventsError)}</p>
              ) : relatedEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No event data linked to this spot yet.</p>
              ) : (
                <div className="space-y-2">
                  {relatedEvents.map((event: any) => (
                    <div key={event.event.id} className="rounded-md border p-3 text-sm">
                      <p className="font-medium">{event.event.title}</p>
                      <p className="text-xs text-muted-foreground">{event.event.location}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-2 border-t pt-4">
              <h3 className="text-sm font-semibold">Notable Records</h3>
              {isRelatedRecordsLoading ? (
                <p className="text-sm text-muted-foreground">Loading related records...</p>
              ) : isRelatedRecordsError ? (
                <p className="text-sm text-muted-foreground">{parseQueryError(relatedRecordsError)}</p>
              ) : relatedRecords.length === 0 ? (
                <p className="text-sm text-muted-foreground">No competitive records linked to this spot yet.</p>
              ) : (
                <div className="space-y-2">
                  {relatedRecords.map((record: any) => (
                    <div key={record.id} className="rounded-md border p-3 text-sm">
                      <p className="font-medium">
                        {record.athleteName} • {record.discipline} • {record.resultValue}
                        {record.resultUnit}
                      </p>
                      <p className="text-xs text-muted-foreground">{record.eventName}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
