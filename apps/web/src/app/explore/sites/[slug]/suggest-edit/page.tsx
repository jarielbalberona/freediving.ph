"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { PenLine } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { AuthGuard } from "@/components/auth/guard";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { exploreApi } from "@/features/diveSpots/api/explore-v1";
import {
  siteEditProposalSchema,
  type SiteEditProposalValues,
} from "@/features/diveSpots/schemas/siteEditProposal.schema";
import { getApiError, getApiErrorMessage } from "@/lib/http/api-error";
import { queryKeys } from "@/lib/query/query-keys";

import { MapPinPickerDialog } from "../../../submit/map-pin-picker-dialog";
import {
  formatPinnedAreaLabel,
  hasSelectedLocation,
  type SiteLocation,
} from "../../../submit/location-utils";

const toNumber = (value: string | undefined): number | undefined => {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const hazardsToText = (hazards: string[] | undefined) =>
  hazards?.filter(Boolean).join(", ") ?? "";

const initialValues: SiteEditProposalValues = {
  name: "",
  location: null,
  description: "",
  entryDifficulty: "moderate",
  depthMinM: "",
  depthMaxM: "",
  hazards: "",
  bestSeason: "",
  typicalConditions: "",
  access: "",
  fees: "",
};

export default function SuggestDiveSiteEditPage() {
  const params = useParams<{ slug: string }>();
  const queryClient = useQueryClient();
  const slug = String(params.slug ?? "");
  const [submittedState, setSubmittedState] = useState<"pending" | "applied" | null>(
    null,
  );
  const [isMapOpen, setIsMapOpen] = useState(false);

  const detailQuery = useQuery({
    queryKey: queryKeys.explore.siteDetail(slug),
    enabled: slug.length > 0,
    queryFn: () => exploreApi.getSiteBySlug(slug),
  });

  const form = useForm<SiteEditProposalValues>({
    resolver: zodResolver(siteEditProposalSchema),
    defaultValues: initialValues,
  });
  const selectedLocation = form.watch("location");
  const canSubmit =
    hasSelectedLocation(selectedLocation) && !form.formState.isSubmitting;

  useEffect(() => {
    const site = detailQuery.data?.site;
    if (!site) return;
    form.reset({
      name: site.name,
      location:
        site.latitude != null && site.longitude != null
          ? { lat: site.latitude, lng: site.longitude, area: site.area }
          : null,
      description: site.description ?? "",
      entryDifficulty: site.difficulty,
      depthMinM: site.depthMinM == null ? "" : String(site.depthMinM),
      depthMaxM: site.depthMaxM == null ? "" : String(site.depthMaxM),
      hazards: hazardsToText(site.hazards),
      bestSeason: site.bestSeason ?? "",
      typicalConditions: site.typicalConditions ?? "",
      access: site.access ?? "",
      fees: site.fees ?? "",
    });
  }, [detailQuery.data?.site, form]);

  const submitMutation = useMutation({
    mutationFn: async (values: SiteEditProposalValues) => {
      if (!values.location) {
        throw new Error("Dive spot location is required");
      }
      const response = await exploreApi.createSiteEditProposal(slug, {
        name: values.name.trim(),
        lat: values.location.lat,
        lng: values.location.lng,
        description: values.description.trim(),
        entryDifficulty: values.entryDifficulty,
        depthMinM: toNumber(values.depthMinM),
        depthMaxM: toNumber(values.depthMaxM),
        hazards: values.hazards
          ?.split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        bestSeason: values.bestSeason?.trim() || undefined,
        typicalConditions: values.typicalConditions?.trim() || undefined,
        access: values.access?.trim() || undefined,
        fees: values.fees?.trim() || undefined,
      });
      return response;
    },
    onSuccess: (response) => {
      setSubmittedState(response.appliedImmediately ? "applied" : "pending");
      if (response.appliedImmediately) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.explore.siteDetail(slug),
        });
      }
    },
    onError: (error) => {
      const apiError = getApiError(error);
      for (const issue of apiError.issues ?? []) {
        const field = String(issue.path[0] ?? "");
        if (field === "lat" || field === "lng") {
          form.setError("location", { message: issue.message });
          continue;
        }
        if (field in initialValues) {
          form.setError(field as keyof SiteEditProposalValues, {
            message: issue.message,
          });
        }
      }
    },
  });

  return (
    <AuthGuard
      title="Sign in to suggest a dive site edit"
      description="Members can suggest corrections for approved dive sites."
    >
      <div className="min-h-full bg-gradient-to-b from-muted/30 to-background px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="flex items-center justify-between gap-3">
            <Link
              href={`/explore/sites/${slug}`}
              className={buttonVariants({ variant: "outline" })}
            >
              Back to site
            </Link>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Suggest edit</CardTitle>
              <p className="text-sm text-muted-foreground">
                Suggested edits are reviewed before they change public Explore.
                Super admins apply edits immediately.
              </p>
            </CardHeader>
            <CardContent>
              {detailQuery.error ? (
                <p className="text-sm text-destructive">
                  {getApiErrorMessage(
                    detailQuery.error,
                    "Failed to load dive site",
                  )}
                </p>
              ) : null}

              {submittedState ? (
                <div className="mb-5 rounded-xl border border-border bg-muted/40 p-4 text-sm">
                  {submittedState === "applied"
                    ? "Edit applied immediately."
                    : "Edit submitted for moderator review."}
                </div>
              ) : null}

              <Form {...form}>
                <form
                  className="grid gap-5"
                  onSubmit={form.handleSubmit((values) =>
                    submitMutation.mutate(values),
                  )}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dive spot location</FormLabel>
                          <div className="flex flex-wrap items-center gap-3">
                            {!hasSelectedLocation(field.value) ? (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsMapOpen(true)}
                              >
                                Mark on map
                              </Button>
                            ) : (
                              <>
                                <Badge className="rounded-full bg-sky-100 px-3 py-1 text-sky-950">
                                  {formatPinnedAreaLabel(field.value)}
                                </Badge>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon-sm"
                                  onClick={() => setIsMapOpen(true)}
                                  aria-label="Edit pin"
                                  title="Edit pin"
                                >
                                  <PenLine />
                                </Button>
                              </>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500">
                            Select a pin once. We store a coarse city or
                            municipality plus province for privacy.
                          </p>
                          <FormMessage />
                          <MapPinPickerDialog
                            open={isMapOpen}
                            value={field.value as SiteLocation | null}
                            onOpenChange={setIsMapOpen}
                            onConfirm={(location) => {
                              field.onChange(location);
                              form.clearErrors("location");
                            }}
                          />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-3">
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Correct site layout, entry notes, marine life, or other useful planning details."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="entryDifficulty"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Entry difficulty</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select difficulty" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectGroup>
                                <SelectItem value="easy">Easy</SelectItem>
                                <SelectItem value="moderate">
                                  Moderate
                                </SelectItem>
                                <SelectItem value="hard">Hard</SelectItem>
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="depthMinM"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Min depth, meters</FormLabel>
                          <FormControl>
                            <Input inputMode="decimal" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="depthMaxM"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max depth, meters</FormLabel>
                          <FormControl>
                            <Input inputMode="decimal" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="hazards"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hazards</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="boat traffic, waves, current"
                            {...field}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Separate hazards with commas. Do not add speculation.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="bestSeason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Best season</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="fees"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fees</FormLabel>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="typicalConditions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Typical conditions</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="access"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Access</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {submitMutation.error ? (
                    <p className="text-sm text-destructive">
                      {getApiErrorMessage(
                        submitMutation.error,
                        "Failed to submit edit",
                      )}
                    </p>
                  ) : null}

                  <Button
                    type="submit"
                    disabled={
                      !canSubmit ||
                      submitMutation.isPending ||
                      detailQuery.isLoading
                    }
                  >
                    {submitMutation.isPending ? "Submitting..." : "Submit edit"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
}
