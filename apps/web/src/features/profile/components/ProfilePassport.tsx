"use client";

import type {
  PassportMemoryItem,
  PassportSettings,
  PassportSectionState,
  PassportJourneyEntry,
  ProfilePassport as ProfilePassportContract,
  UserBadge,
} from "@freediving.ph/types";
import {
  BadgeCheck,
  BookOpen,
  Compass,
  IdCard,
  Map,
  Settings2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ProfileTabHeader } from "@/features/profile/components/ProfileTabHeader";
import { useUpdatePassportSettings } from "@/features/profile/hooks/passport-mutations";
import { useProfilePassportQuery } from "@/features/profile/hooks/queries";

export function ProfilePassport({
  username,
  isOwner,
}: {
  username: string;
  isOwner: boolean;
}) {
  const { data, isLoading, isError } = useProfilePassportQuery(username);
  const passport = data?.passport;

  if (isLoading && !passport) {
    return <PassportShell title="Loading Passport" />;
  }
  if (isError || !passport) {
    return <PassportShell title="Passport is unavailable" />;
  }

  const visibleBadges = isVisibleSection(passport.badgeShowcase.state);
  const visibleMap = isVisibleSection(passport.mapPreview.state);
  const strongestBadge =
    passport.badgeShowcase.badges[0] ?? passport.badgeShowcase.autoStats[0];
  const storyPreview = selectStoryPreview(passport);
  const hasHighlights =
    visibleBadges &&
    (passport.badgeShowcase.state.status === "ready" ||
      passport.badgeShowcase.autoStats.length > 0);
  const hasDiveFootprint = visibleMap;
  const hasStoryPreview = storyPreview !== null;

  return (
    <section aria-labelledby="profile-passport-heading" className="space-y-6">
      <ProfileTabHeader
        id="profile-passport-heading"
        title="Passport"
        subtitle="A snapshot of this diver's milestones, places, and story."
        eyebrow="Public Showcase"
        icon={<IdCard aria-hidden="true" className="h-4 w-4" />}
        action={
          isOwner ? (
            <PassportCustomizeDialog
              username={username}
              settings={passport.settings}
            />
          ) : null
        }
      />

      <PassportHero passport={passport} strongestBadge={strongestBadge} />

      {hasHighlights ? (
        <>
          <Separator />
          <PassportSection
            icon={<Sparkles aria-hidden="true" className="h-4 w-4" />}
            title="Highlights"
          >
            <div className="space-y-4">
              {visibleBadges && passport.badgeShowcase.badges.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">
                    Featured badges
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {passport.badgeShowcase.badges.map((badge) => (
                      <Badge
                        key={badge.id}
                        variant="secondary"
                        className={badgeChipClassName(badge, "featured")}
                      >
                        <span>{badge.name}</span>
                        {badge.displayValue ? (
                          <span className="text-[11px] text-current/70">
                            {badge.displayValue}
                          </span>
                        ) : null}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              {visibleBadges && passport.badgeShowcase.autoStats.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">
                    Explorer stamps
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {passport.badgeShowcase.autoStats.map((badge) => (
                      <Badge
                        key={badge.id}
                        variant="outline"
                        className={badgeChipClassName(badge, "auto")}
                      >
                        <span>{badge.name}</span>
                        {badge.displayValue ? (
                          <span className="text-[11px] text-current/70">
                            {badge.displayValue}
                          </span>
                        ) : null}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </PassportSection>
        </>
      ) : null}

      {hasDiveFootprint ? (
        <>
          <Separator />
          <PassportSection
            icon={<Map aria-hidden="true" className="h-4 w-4" />}
            title="Dive footprint"
          >
            {passport.mapPreview.state.status === "ready" ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">
                    {passport.mapPreview.visitedSiteCount} visited sites
                  </Badge>
                  <Link
                    href={`/${username}?tab=dive-memories`}
                    className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
                  >
                    Open Dive Memories
                  </Link>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {passport.mapPreview.markers.slice(0, 3).map((marker) => (
                    <div
                      key={marker.diveSiteId}
                      className="rounded-2xl bg-muted/45 px-3 py-2"
                    >
                      <p className="truncate font-medium text-sm">
                        {marker.diveSiteName}
                      </p>
                      <p className="truncate text-muted-foreground text-xs">
                        {marker.diveSiteArea || "Dive site"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <SectionState
                state={passport.mapPreview.state}
                label="No proof-backed dive sites are visible here yet."
              />
            )}
          </PassportSection>
        </>
      ) : null}

      {hasStoryPreview ? (
        <>
          <Separator />
          <PassportSection
            icon={<BookOpen aria-hidden="true" className="h-4 w-4" />}
            title="Recent story"
          >
            <StoryPreview preview={storyPreview} />
          </PassportSection>
        </>
      ) : null}

      {!hasHighlights && !hasDiveFootprint && !hasStoryPreview ? (
        <>
          <Separator />
          <PassportEmptyState isOwner={isOwner} />
        </>
      ) : null}
    </section>
  );
}

function PassportHero({
  passport,
  strongestBadge,
}: {
  passport: ProfilePassportContract;
  strongestBadge?: ProfilePassportContract["badgeShowcase"]["badges"][number];
}) {
  const profile = passport.profile;
  const displayName = profile.displayName ?? profile.username;
  const stats = [
    { label: "Posts", value: passport.stats.mediaPostCount },
    ...(isVisibleSection(passport.mapPreview.state)
      ? [{ label: "Sites", value: passport.stats.visitedSiteCount }]
      : []),
    ...(isVisibleSection(passport.badgeShowcase.state)
      ? [{ label: "Badges", value: passport.stats.badgeCount }]
      : []),
    ...(isVisibleSection(passport.journeyHighlights.state)
      ? [{ label: "Journey", value: passport.stats.journeyEntryCount }]
      : []),
    ...(isVisibleSection(passport.memories.state)
      ? [{ label: "Memories", value: passport.stats.memoryCount }]
      : []),
  ];

  return (
    <div
      className="overflow-hidden rounded-[22px]"
      style={{
        backgroundImage:
          "linear-gradient(to right, rgb(219, 234, 254), rgb(147, 197, 253), rgb(59, 130, 246))",
      }}
    >
      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <UserAvatar
              src={profile.avatarUrl}
              displayName={displayName}
              size="default"
              className="shrink-0"
            />
            <div className="space-y-1.5">
              <div className="space-y-1">
                <p className="text-lg font-semibold tracking-tight">
                  {displayName}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 text-black/90 text-xs sm:text-sm">
                  <span>@{profile.username}</span>
                  {profile.locationText ? (
                    <>
                      <span aria-hidden="true">•</span>
                      <span>{profile.locationText}</span>
                    </>
                  ) : null}
                </div>
              </div>
              <p className="max-w-xl text-black/80 text-xs leading-5 sm:text-sm">
                {profile.bio?.trim() ||
                  "A snapshot of this diver's milestones, places, and story."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 sm:grid sm:min-w-[360px] sm:grid-cols-5">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className={`rounded-full px-2.5 py-1 text-center text-xs whitespace-nowrap ${statChipClassName(
                  stat.label,
                )}`}
              >
                <span className="font-semibold">{stat.value}</span>
                <span className="ml-1 text-current/70">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {strongestBadge ? (
          <div
            className={`flex flex-wrap items-center gap-1.5 rounded-xl px-2.5 py-2 ${featuredBadgeRowClassName(
              strongestBadge,
            )}`}
          >
            <BadgeCheck
              aria-hidden="true"
              className="h-3.5 w-3.5 text-current/75"
            />
            <span className="font-medium text-xs sm:text-sm">
              {strongestBadge.name}
            </span>
            {strongestBadge.displayValue ? (
              <Badge
                variant="secondary"
                className={`h-5 px-1.5 text-[10px] shadow-none ${featuredBadgeValueClassName(
                  strongestBadge,
                )}`}
              >
                {strongestBadge.displayValue}
              </Badge>
            ) : null}
            <span className="text-[11px] text-current/70">
              Featured identity marker
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PassportSection({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <h3 className="font-medium text-foreground text-sm">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function PassportCustomizeDialog({
  username,
  settings,
}: {
  username: string;
  settings: PassportSettings;
}) {
  const updateSettings = useUpdatePassportSettings(username);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(settings);
  const sections = [
    ["showMap", "Dive footprint"],
    ["showBadges", "Badge highlights"],
    ["showJourney", "Journey story"],
    ["showMemories", "Memory story"],
  ] as const;

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" size="sm" variant="outline">
            <Settings2 aria-hidden="true" className="h-4 w-4" />
            Customize Passport
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Customize Passport</DialogTitle>
          <DialogDescription>
            Choose which Passport sections stay visible in the public showcase.
          </DialogDescription>
        </DialogHeader>

        <fieldset className="space-y-3">
          <legend className="font-medium text-sm">Passport sections</legend>
          <div className="grid gap-2">
            {sections.map(([key, label]) => (
              <label
                key={key}
                htmlFor={`passport-${key}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 px-3 py-2 text-sm"
              >
                <span>{label}</span>
                <input
                  id={`passport-${key}`}
                  name={key}
                  type="checkbox"
                  checked={draft[key]}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      [key]: event.target.checked,
                    }))
                  }
                  className="h-4 w-4"
                />
              </label>
            ))}
          </div>
        </fieldset>

        <DialogFooter showCloseButton>
          <Button
            type="button"
            disabled={updateSettings.isPending}
            onClick={() =>
              updateSettings.mutate(draft, {
                onSuccess: () => setOpen(false),
              })
            }
          >
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StoryPreview({
  preview,
}: {
  preview:
    | { kind: "memory"; item: PassportMemoryItem }
    | { kind: "journey"; item: PassportJourneyEntry };
}) {
  if (preview.kind === "memory") {
    return (
      <div className="space-y-2 rounded-2xl bg-muted/45 px-4 py-3">
        <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-[0.18em]">
          <Compass aria-hidden="true" className="h-3.5 w-3.5" />
          <span>Dive memory</span>
        </div>
        <p className="font-medium text-sm">{preview.item.title}</p>
        {preview.item.body ? (
          <p className="line-clamp-3 text-muted-foreground text-sm leading-6">
            {preview.item.body}
          </p>
        ) : null}
        <p className="text-muted-foreground text-xs">
          {formatDateLabel(preview.item.occurredAt)}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-2xl bg-muted/45 px-4 py-3">
      <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-[0.18em]">
        <BookOpen aria-hidden="true" className="h-3.5 w-3.5" />
        <span>Journey highlight</span>
      </div>
      <p className="font-medium text-sm">{preview.item.title}</p>
      {preview.item.body ? (
        <p className="line-clamp-3 text-muted-foreground text-sm leading-6">
          {preview.item.body}
        </p>
      ) : null}
      <p className="text-muted-foreground text-xs">
        {formatDateLabel(preview.item.occurredAt)}
      </p>
    </div>
  );
}

function PassportEmptyState({ isOwner }: { isOwner: boolean }) {
  return (
    <section className="rounded-2xl bg-muted/35 px-4 py-4 text-sm text-muted-foreground">
      {isOwner
        ? "Your Passport is still sparse. Add visible dive milestones, places, or memories, then use Customize Passport to shape the public view."
        : "This diver has not surfaced enough public Passport highlights yet."}
    </section>
  );
}

function SectionState({
  state,
  label,
}: {
  state: PassportSectionState;
  label: string;
}) {
  return (
    <p className="text-muted-foreground text-sm">
      {state.status === "unavailable" ? "Not available yet" : label}
    </p>
  );
}

function PassportShell({ title }: { title: string }) {
  return (
    <section
      aria-live="polite"
      className="rounded-lg border border-dashed p-4 text-muted-foreground text-sm"
    >
      {title}
    </section>
  );
}

function isVisibleSection(state: PassportSectionState) {
  return state.status !== "hidden";
}

function selectStoryPreview(passport: ProfilePassportContract) {
  if (
    isVisibleSection(passport.memories.state) &&
    passport.memories.state.status === "ready" &&
    passport.memories.items.length > 0
  ) {
    return { kind: "memory" as const, item: passport.memories.items[0] };
  }
  if (
    isVisibleSection(passport.journeyHighlights.state) &&
    passport.journeyHighlights.state.status === "ready" &&
    passport.journeyHighlights.entries.length > 0
  ) {
    return {
      kind: "journey" as const,
      item: passport.journeyHighlights.entries[0],
    };
  }
  return null;
}

function formatDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function statChipClassName(label: string) {
  switch (label) {
    case "Posts":
      return "border border-rose-200 bg-rose-50/85 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/35 dark:text-rose-100";
    case "Sites":
      return "border border-cyan-200 bg-cyan-50/85 text-cyan-900 dark:border-cyan-900/50 dark:bg-cyan-950/35 dark:text-cyan-100";
    case "Badges":
      return "border border-amber-200 bg-amber-50/85 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-100";
    case "Journey":
      return "border border-violet-200 bg-violet-50/85 text-violet-900 dark:border-violet-900/50 dark:bg-violet-950/35 dark:text-violet-100";
    case "Memories":
      return "border border-emerald-200 bg-emerald-50/85 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/35 dark:text-emerald-100";
    default:
      return "border border-border/70 bg-background/80 text-foreground";
  }
}

function badgeChipClassName(badge: UserBadge, tone: "featured" | "auto") {
  const base =
    "max-w-full gap-1 break-words border px-2.5 py-1 shadow-none transition-colors";
  const palette = badgePalette(badge);

  if (tone === "auto") {
    return `${base} ${palette.auto}`;
  }

  return `${base} ${palette.featured}`;
}

function featuredBadgeRowClassName(badge: UserBadge) {
  return badgePalette(badge).row;
}

function featuredBadgeValueClassName(badge: UserBadge) {
  return badgePalette(badge).value;
}

function badgePalette(badge: UserBadge) {
  switch (badge.category) {
    case "certification":
      return {
        featured:
          "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-200",
        auto: "border-sky-200/80 bg-sky-50/70 text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/25 dark:text-sky-200",
        row: "border border-sky-200 bg-sky-50/85 text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/35 dark:text-sky-100",
        value:
          "border-sky-300/70 bg-white/70 text-sky-900 dark:border-sky-800/60 dark:bg-sky-900/45 dark:text-sky-100",
      };
    case "personal_best":
      return {
        featured:
          "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-100",
        auto: "border-amber-200/80 bg-amber-50/70 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100",
        row: "border border-amber-200 bg-amber-50/80 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-100",
        value:
          "border-amber-300/70 bg-white/70 text-amber-950 dark:border-amber-800/60 dark:bg-amber-900/45 dark:text-amber-100",
      };
    case "community_role":
      return {
        featured:
          "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900/50 dark:bg-violet-950/35 dark:text-violet-100",
        auto: "border-violet-200/80 bg-violet-50/70 text-violet-800 dark:border-violet-900/50 dark:bg-violet-950/20 dark:text-violet-100",
        row: "border border-violet-200 bg-violet-50/80 text-violet-900 dark:border-violet-900/50 dark:bg-violet-950/35 dark:text-violet-100",
        value:
          "border-violet-300/70 bg-white/70 text-violet-900 dark:border-violet-800/60 dark:bg-violet-900/45 dark:text-violet-100",
      };
    case "experience":
      return {
        featured:
          "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/35 dark:text-emerald-100",
        auto: "border-emerald-200/80 bg-emerald-50/70 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-100",
        row: "border border-emerald-200 bg-emerald-50/80 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/35 dark:text-emerald-100",
        value:
          "border-emerald-300/70 bg-white/70 text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-900/45 dark:text-emerald-100",
      };
    default:
      return {
        featured:
          "border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-900/50 dark:bg-cyan-950/35 dark:text-cyan-100",
        auto: "border-cyan-200/80 bg-cyan-50/70 text-cyan-800 dark:border-cyan-900/50 dark:bg-cyan-950/20 dark:text-cyan-100",
        row: "border border-cyan-200 bg-cyan-50/80 text-cyan-900 dark:border-cyan-900/50 dark:bg-cyan-950/35 dark:text-cyan-100",
        value:
          "border-cyan-300/70 bg-white/70 text-cyan-900 dark:border-cyan-800/60 dark:bg-cyan-900/45 dark:text-cyan-100",
      };
  }
}
