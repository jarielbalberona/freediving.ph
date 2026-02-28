"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { PenLine } from "lucide-react";
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
  siteSubmissionSchema,
  type SiteSubmissionValues,
} from "@/features/diveSpots/schemas/siteSubmission.schema";
import { getApiError, getApiErrorMessage } from "@/lib/http/api-error";

import { MapPinPickerDialog } from "./map-pin-picker-dialog";
import {
  formatPinnedAreaLabel,
  hasSelectedLocation,
  type SiteLocation,
} from "./location-utils";

const initialValues: SiteSubmissionValues = {
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

const toNumber = (value: string | undefined): number | undefined => {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const entryDifficultyItems = [
  { value: "easy", label: "Easy" },
  { value: "moderate", label: "Moderate" },
  { value: "hard", label: "Hard" },
] as const;

export default function ExploreSubmitPage() {
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [isMapOpen, setIsMapOpen] = useState(false);

  const form = useForm<SiteSubmissionValues>({
    resolver: zodResolver(siteSubmissionSchema),
    defaultValues: initialValues,
  });

  const selectedLocation = form.watch("location");
  const canSubmit =
    hasSelectedLocation(selectedLocation) && !form.formState.isSubmitting;

  const submitMutation = useMutation({
    mutationFn: async (values: SiteSubmissionValues) => {
      if (!values.location) {
        throw new Error("Dive spot location is required");
      }

      const response = await exploreApi.submitSite({
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
      return response.submission;
    },
    onSuccess: (submission) => {
      setSubmittedId(submission.id);
      form.reset(initialValues);
    },
    onError: (error) => {
      const apiError = getApiError(error);
      const locationIssue = apiError.issues?.find(
        (issue) => issue.path[0] === "location",
      );
      if (locationIssue) {
        form.setError("location", { message: locationIssue.message });
      }
    },
  });

  const onSubmit = (values: SiteSubmissionValues) => {
    submitMutation.mutate(values);
  };

  const requiredAsterisk = <span className="ml-1 text-rose-600">*</span>;

  return (
    <AuthGuard
      title="Sign in to submit a dive site"
      description="Members can propose new dive sites for moderator review."
    >
      <div className="min-h-full bg-[linear-gradient(180deg,_#f4fbff_0%,_#ffffff_100%)] px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <section className="rounded-[28px] border border-sky-900/10 bg-white/90 p-6 shadow-sm">
            <Badge className="rounded-full bg-sky-950 text-white">
              Explore submission
            </Badge>
            <h1 className="mt-3 font-serif text-4xl tracking-tight text-zinc-950">
              Submit a dive site
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-600">
              New sites stay pending until a moderator approves them. Public
              Explore still shows approved sites only.
            </p>
          </section>

          {submittedId ? (
            <Card className="rounded-[24px] border-emerald-500/20 bg-emerald-50/70">
              <CardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-emerald-900">
                    Submission received
                  </p>
                  <p className="text-sm text-emerald-800">
                    Status: pending review
                  </p>
                </div>
                <Link
                  href={`/explore/submissions/${submittedId}`}
                  className={buttonVariants()}
                >
                  View submission
                </Link>
              </CardContent>
            </Card>
          ) : null}

          <Card className="rounded-[24px] bg-white/90">
            <CardHeader>
              <CardTitle>Site details</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="grid gap-5"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel htmlFor="site-name">
                            Name
                            {requiredAsterisk}
                          </FormLabel>
                          <FormControl>
                            <Input id="site-name" {...field} />
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
                          <FormLabel>
                            Dive spot location
                            {requiredAsterisk}
                          </FormLabel>
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
                          <FormLabel htmlFor="site-description">
                            Description
                            {requiredAsterisk}
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              id="site-description"
                              placeholder="Describe the dive site, layout, marine life, and what divers should expect."
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
                          <FormLabel htmlFor="site-difficulty">
                            Entry difficulty
                            {requiredAsterisk}
                          </FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            items={entryDifficultyItems}
                          >
                            <FormControl>
                              <SelectTrigger
                                id="site-difficulty"
                                className="w-full"
                              >
                                <SelectValue placeholder="Select difficulty" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectGroup>
                                {entryDifficultyItems.map((item) => (
                                  <SelectItem
                                    key={item.value}
                                    value={item.value}
                                  >
                                    {item.label}
                                  </SelectItem>
                                ))}
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
                          <FormLabel htmlFor="site-depth-min">
                            Depth min (m)
                          </FormLabel>
                          <FormControl>
                            <Input
                              id="site-depth-min"
                              type="text"
                              inputMode="decimal"
                              {...field}
                            />
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
                          <FormLabel htmlFor="site-depth-max">
                            Depth max (m)
                          </FormLabel>
                          <FormControl>
                            <Input
                              id="site-depth-max"
                              type="text"
                              inputMode="decimal"
                              {...field}
                            />
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
                        <FormLabel htmlFor="site-hazards">Hazards</FormLabel>
                        <FormControl>
                          <Input
                            id="site-hazards"
                            placeholder="Comma-separated, e.g. surge, boat traffic"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bestSeason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="site-best-season">
                          Best season
                        </FormLabel>
                        <FormControl>
                          <Input id="site-best-season" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="typicalConditions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="site-conditions">
                          Typical conditions
                        </FormLabel>
                        <FormControl>
                          <Textarea id="site-conditions" {...field} />
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
                        <FormLabel htmlFor="site-access">Access</FormLabel>
                        <FormControl>
                          <Textarea id="site-access" {...field} />
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
                          <FormLabel htmlFor="site-fees">Fees</FormLabel>
                          <FormControl>
                            <Textarea id="site-fees" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                  {submitMutation.error ? (
                    <p className="text-sm text-red-600">
                      {getApiErrorMessage(
                        submitMutation.error,
                        "Failed to submit dive site",
                      )}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="submit"
                      className="rounded-full"
                      disabled={!canSubmit || submitMutation.isPending}
                    >
                      {submitMutation.isPending
                        ? "Submitting..."
                        : "Submit for review"}
                    </Button>
                    <Link
                      href="/explore/submissions"
                      className={buttonVariants({ variant: "outline" })}
                    >
                      View my submissions
                    </Link>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
}
