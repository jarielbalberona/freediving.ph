import { Link } from "expo-router";
import type { Href } from "expo-router";
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";

import { SocialListRow, SocialMetadataLine, StatusPill } from "@/components/social";
import {
  MobileEmptyState,
  MobileErrorState,
  MobileLoadingState,
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";
import {
  usePeopleSearchQuery,
  useSavedHubQuery,
  useSiteSearchQuery,
} from "@/features/search/hooks/use-search-queries";

type SearchScope = "people" | "sites" | "saved";

type SearchScreenProps = {
  initialScope?: SearchScope;
};

const safeSegment = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed &&
    !trimmed.includes("/") &&
    !trimmed.includes("?") &&
    !trimmed.includes("#")
    ? trimmed
    : undefined;
};

export function SearchScreen({ initialScope = "people" }: SearchScreenProps) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<SearchScope>(initialScope);
  const peopleQuery = usePeopleSearchQuery(query);
  const sitesQuery = useSiteSearchQuery(query);
  const savedQuery = useSavedHubQuery();
  const people = peopleQuery.data ?? [];
  const sites = sitesQuery.data ?? [];
  const savedSites = savedQuery.data?.sites ?? [];
  const savedUsers = savedQuery.data?.users ?? [];
  const needsQuery = scope !== "saved" && query.trim().length < 2;

  return (
    <MobileScrollScreen subtitle="People, sites, and saved items" title="Search">
      <MobileSection
        description="Search is intentionally scoped to backend-backed people and dive-site contracts."
        title="Find"
      >
        <View className="gap-3">
          {scope !== "saved" ? (
            <TextInput
              className="min-h-11 rounded-2xl border border-border bg-card px-4 text-foreground"
              onChangeText={setQuery}
              placeholder={scope === "people" ? "Search divers" : "Search dive sites"}
              placeholderTextColor="#64748b"
              returnKeyType="search"
              value={query}
            />
          ) : null}
          <View className="flex-row flex-wrap gap-2">
            {(["people", "sites", "saved"] as const).map((nextScope) => (
              <MobileButton
                key={nextScope}
                variant={scope === nextScope ? "primary" : "secondary"}
                onPress={() => setScope(nextScope)}
              >
                {nextScope === "people"
                  ? "People"
                  : nextScope === "sites"
                    ? "Dive sites"
                    : "Saved"}
              </MobileButton>
            ))}
          </View>
        </View>
      </MobileSection>

      {needsQuery ? (
        <MobileEmptyState
          description="Enter at least two characters to search."
          title="Start typing"
        />
      ) : null}

      {scope === "people" && !needsQuery ? (
        <MobileSection title="People">
          {peopleQuery.isLoading ? <MobileLoadingState message="Searching people." /> : null}
          {peopleQuery.error ? (
            <MobileErrorState
              message="People search could not be loaded."
              title="Search unavailable"
            />
          ) : null}
          {!peopleQuery.isLoading && !peopleQuery.error && people.length === 0 ? (
            <MobileEmptyState description="No divers matched this search." title="No people found" />
          ) : null}
          <View className="gap-3">
            {people.map((person) => {
              const username = safeSegment(person.username);
              const row = (
                <SocialListRow
                  body={person.bio || person.homeArea || "Profile"}
                  meta={[person.homeArea, person.certLevel].filter(Boolean)}
                  name="Diver"
                  title={person.displayName || person.username}
                >
                  <SocialMetadataLine
                    values={[
                      `${person.buddyCount ?? 0} buddies`,
                      person.emailVerified ? "Email verified" : "",
                    ]}
                  />
                </SocialListRow>
              );
              return username ? (
                <Link
                  asChild
                  href={
                    {
                      pathname: "/(app)/(tabs)/(home)/profile/[username]",
                      params: { username },
                    } as unknown as Href
                  }
                  key={person.userId}
                >
                  <Pressable accessibilityRole="link">{row}</Pressable>
                </Link>
              ) : (
                <View key={person.userId}>{row}</View>
              );
            })}
          </View>
        </MobileSection>
      ) : null}

      {scope === "sites" && !needsQuery ? (
        <MobileSection title="Dive sites">
          {sitesQuery.isLoading ? <MobileLoadingState message="Searching dive sites." /> : null}
          {sitesQuery.error ? (
            <MobileErrorState
              message="Dive-site search could not be loaded."
              title="Search unavailable"
            />
          ) : null}
          {!sitesQuery.isLoading && !sitesQuery.error && sites.length === 0 ? (
            <MobileEmptyState description="No dive sites matched this search." title="No sites found" />
          ) : null}
          <View className="gap-3">
            {sites.map((site) => {
              const slug = safeSegment(site.slug);
              const row = (
                <SocialListRow
                  body={site.lastConditionSummary || site.area}
                  meta={[site.area, site.difficulty].filter(Boolean)}
                  name="Dive site"
                  status={
                    site.verificationStatus === "verified" ? (
                      <StatusPill>Verified</StatusPill>
                    ) : null
                  }
                  title={site.name}
                />
              );
              return slug ? (
                <Link
                  asChild
                  href={
                    {
                      pathname: "/(app)/(tabs)/(home)/explore/[slug]",
                      params: { slug },
                    } as unknown as Href
                  }
                  key={site.id}
                >
                  <Pressable accessibilityRole="link">{row}</Pressable>
                </Link>
              ) : (
                <View key={site.id}>{row}</View>
              );
            })}
          </View>
        </MobileSection>
      ) : null}

      {scope === "saved" ? (
        <MobileSection title="Saved">
          {savedQuery.isLoading ? <MobileLoadingState message="Loading saved items." /> : null}
          {savedQuery.error ? (
            <MobileErrorState
              message="Sign in or try again to load saved items."
              title="Saved unavailable"
            />
          ) : null}
          {!savedQuery.isLoading &&
          !savedQuery.error &&
          savedSites.length === 0 &&
          savedUsers.length === 0 ? (
            <MobileEmptyState
              description="Save dive sites from Explore and divers from profiles."
              title="No saved items"
            />
          ) : null}
          <View className="gap-3">
            {savedSites.map((site) => {
              const slug = safeSegment(site.slug);
              const row = (
                <SocialListRow
                  body={site.lastConditionSummary || "No recent condition summary."}
                  meta={[site.area, site.difficulty].filter(Boolean)}
                  name="Saved site"
                  title={site.name}
                />
              );
              return slug ? (
                <Link
                  asChild
                  href={
                    {
                      pathname: "/(app)/(tabs)/(home)/explore/[slug]",
                      params: { slug },
                    } as unknown as Href
                  }
                  key={site.id}
                >
                  <Pressable accessibilityRole="link">{row}</Pressable>
                </Link>
              ) : (
                <View key={site.id}>{row}</View>
              );
            })}
            {savedUsers.map((user) => {
              const username = safeSegment(user.username);
              const row = (
                <SocialListRow
                  body={user.homeArea || "Saved diver"}
                  meta={[user.certLevel, `${user.buddyCount} buddies`].filter(Boolean)}
                  name="Saved diver"
                  title={user.displayName || user.username}
                />
              );
              return username ? (
                <Link
                  asChild
                  href={
                    {
                      pathname: "/(app)/(tabs)/(home)/profile/[username]",
                      params: { username },
                    } as unknown as Href
                  }
                  key={user.userId}
                >
                  <Pressable accessibilityRole="link">{row}</Pressable>
                </Link>
              ) : (
                <View key={user.userId}>{row}</View>
              );
            })}
          </View>
        </MobileSection>
      ) : null}
    </MobileScrollScreen>
  );
}
