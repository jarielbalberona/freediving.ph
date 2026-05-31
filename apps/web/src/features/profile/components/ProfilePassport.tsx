"use client";

import type {
  PassportMemoryPreview,
  PassportSettings,
  PassportSectionState,
  ProfilePassport as ProfilePassportContract,
} from "@freediving.ph/types";
import { BadgeCheck, BookOpen, Compass, IdCard, Image, Map } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

  return (
    <section aria-labelledby="profile-passport-heading" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <IdCard aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
          <h2 id="profile-passport-heading" className="font-semibold text-base">
            Passport
          </h2>
        </div>
        <Badge variant="outline">{passport.stats.visitedSiteCount} sites</Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <SummaryCard passport={passport} />
        <MapCard passport={passport} />
        <BadgeCard passport={passport} />
        <JourneyCard passport={passport} />
        <MediaCard passport={passport} />
        <MemoryCard memories={passport.memories} />
      </div>
      {isOwner ? (
        <PassportSettingsPanel username={username} settings={passport.settings} />
      ) : null}
    </section>
  );
}

function SummaryCard({ passport }: { passport: ProfilePassportContract }) {
  return (
    <PassportCard icon={<IdCard className="h-4 w-4" />} title="Summary">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <Metric label="Posts" value={passport.stats.mediaPostCount} />
        <Metric label="Badges" value={passport.stats.badgeCount} />
        <Metric label="Journey" value={passport.stats.journeyEntryCount} />
        <Metric label="Memories" value={passport.stats.memoryCount} />
      </div>
    </PassportCard>
  );
}

function MapCard({ passport }: { passport: ProfilePassportContract }) {
  return (
    <PassportCard icon={<Map aria-hidden="true" className="h-4 w-4" />} title="Dive Map">
      {passport.mapPreview.state.status === "ready" ? (
        <div className="space-y-2">
          <Metric label="Visited sites" value={passport.mapPreview.visitedSiteCount} />
          <div className="space-y-1">
            {passport.mapPreview.markers.slice(0, 3).map((marker) => (
              <p key={marker.diveSiteId} className="truncate text-sm" title={marker.diveSiteName}>
                {marker.diveSiteName}
              </p>
            ))}
          </div>
        </div>
      ) : (
        <SectionState state={passport.mapPreview.state} label="No visited sites yet" />
      )}
    </PassportCard>
  );
}

function BadgeCard({ passport }: { passport: ProfilePassportContract }) {
  return (
    <PassportCard
      icon={<BadgeCheck aria-hidden="true" className="h-4 w-4" />}
      title="Badges"
    >
      {passport.badgeShowcase.state.status === "ready" ? (
        <div className="flex flex-wrap gap-2">
          {passport.badgeShowcase.badges.slice(0, 4).map((badge) => (
            <Badge key={badge.id} variant="secondary" className="max-w-full break-words">
              {badge.name}
            </Badge>
          ))}
        </div>
      ) : (
        <SectionState state={passport.badgeShowcase.state} label="No badges yet" />
      )}
    </PassportCard>
  );
}

function JourneyCard({ passport }: { passport: ProfilePassportContract }) {
  return (
    <PassportCard
      icon={<BookOpen aria-hidden="true" className="h-4 w-4" />}
      title="Journey"
    >
      {passport.journeyHighlights.state.status === "ready" ? (
        <div className="space-y-1">
          {passport.journeyHighlights.entries.slice(0, 3).map((entry) => (
            <p key={entry.id} className="truncate text-sm" title={entry.title}>
              {entry.title}
            </p>
          ))}
        </div>
      ) : (
        <SectionState
          state={passport.journeyHighlights.state}
          label="No journey highlights yet"
        />
      )}
    </PassportCard>
  );
}

function MediaCard({ passport }: { passport: ProfilePassportContract }) {
  return (
    <PassportCard icon={<Image aria-hidden="true" className="h-4 w-4" />} title="Media">
      {passport.recentMedia.state.status === "ready" ? (
        <Metric label="Recent media" value={passport.recentMedia.items.length} />
      ) : (
        <SectionState state={passport.recentMedia.state} label="No recent media yet" />
      )}
    </PassportCard>
  );
}

function MemoryCard({ memories }: { memories: PassportMemoryPreview }) {
  return (
    <PassportCard
      icon={<Compass aria-hidden="true" className="h-4 w-4" />}
      title="Memories"
    >
      {memories.state.status === "ready" ? (
        <div className="space-y-1">
          {memories.items.slice(0, 3).map((memory) => (
            <p key={memory.id} className="truncate text-sm" title={memory.title}>
              {memory.title}
            </p>
          ))}
        </div>
      ) : (
        <SectionState state={memories.state} label="No memories yet" />
      )}
    </PassportCard>
  );
}

function PassportSettingsPanel({
  username,
  settings,
}: {
  username: string;
  settings: PassportSettings;
}) {
  const updateSettings = useUpdatePassportSettings(username);
  const [draft, setDraft] = useState(settings);
  const sections = [
    ["showMap", "Map"],
    ["showBadges", "Badges"],
    ["showJourney", "Journey"],
    ["showMemories", "Memories"],
  ] as const;

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  return (
    <fieldset className="rounded-lg border border-border/70 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <legend className="font-medium text-sm">Passport Sections</legend>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={updateSettings.isPending}
          onClick={() => updateSettings.mutate(draft)}
        >
          Save
        </Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {sections.map(([key, label]) => (
          <label key={key} htmlFor={`passport-${key}`} className="flex items-center gap-2 text-sm">
            <input
              id={`passport-${key}`}
              name={key}
              type="checkbox"
              checked={draft[key]}
              onChange={(event) =>
                setDraft((current) => ({ ...current, [key]: event.target.checked }))
              }
              className="h-4 w-4"
            />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function PassportCard({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  const headingID = `profile-passport-${title.toLowerCase().replaceAll(" ", "-")}`;

  return (
    <article aria-labelledby={headingID} className="rounded-lg border border-border/70 p-3">
      <div className="mb-2 flex min-w-0 items-center gap-2 text-muted-foreground">
        {icon}
        <h3 id={headingID} className="font-medium text-foreground text-sm">
          {title}
        </h3>
      </div>
      {children}
    </article>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-semibold text-base">{value}</p>
      <p className="text-muted-foreground text-xs">{label}</p>
    </div>
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
