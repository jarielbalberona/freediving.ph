import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

import {
  MobileEmptyState,
  MobileErrorState,
  MobileLoadingState,
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";
import {
  CertificationRow,
  instructorStatusLabels,
  safeSegment,
} from "@/features/instructors/components/instructor-ui";
import { usePublicInstructorQuery } from "@/features/instructors/hooks/use-instructors-query";

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export function PublicInstructorScreen() {
  const params = useLocalSearchParams<{ username?: string | string[] }>();
  const username = safeSegment(firstParam(params.username));
  const instructorQuery = usePublicInstructorQuery(username);
  const application = instructorQuery.data?.application;
  const profile = application?.profile;
  const certifications = application?.certifications ?? [];

  return (
    <MobileScrollScreen
      subtitle="Public instructor profile"
      title={profile?.displayName ?? "Instructor"}
    >
      {!username ? (
        <MobileErrorState
          message="The instructor link is invalid."
          title="Instructor unavailable"
        />
      ) : null}
      {instructorQuery.isLoading ? (
        <MobileLoadingState message="Loading instructor profile." />
      ) : null}
      {instructorQuery.error ? (
        <MobileErrorState
          message="This instructor profile could not be loaded."
          title="Instructor unavailable"
        />
      ) : null}
      {profile ? (
        <>
          <MobileSection title="Instructor">
            <View className="gap-2 rounded-2xl border border-border bg-card p-4">
              <Text className="text-xl font-bold text-foreground">
                {profile.displayName || profile.username}
              </Text>
              <Text className="text-sm text-muted-foreground">
                {instructorStatusLabels[profile.verificationStatus]}
              </Text>
              {profile.homeLocationLabel ? (
                <Text className="text-sm text-muted-foreground">
                  {profile.homeLocationLabel}
                </Text>
              ) : null}
              {profile.bio ? (
                <Text className="text-sm leading-5 text-muted-foreground">
                  {profile.bio}
                </Text>
              ) : null}
            </View>
          </MobileSection>
          <MobileSection title="Teaching">
            <View className="gap-2 rounded-2xl border border-border bg-card p-4">
              {profile.specialties ? (
                <Text className="text-sm text-muted-foreground">
                  Specialties: {profile.specialties}
                </Text>
              ) : null}
              {profile.schoolAffiliation ? (
                <Text className="text-sm text-muted-foreground">
                  School: {profile.schoolAffiliation}
                </Text>
              ) : null}
              {profile.safetyCredentials ? (
                <Text className="text-sm text-muted-foreground">
                  Safety: {profile.safetyCredentials}
                </Text>
              ) : null}
            </View>
          </MobileSection>
          <MobileSection title="Certifications">
            {certifications.length === 0 ? (
              <MobileEmptyState
                description="No public certifications are listed."
                title="No certifications"
              />
            ) : (
              <View className="gap-3">
                {certifications.map((certification) => (
                  <CertificationRow
                    certification={certification}
                    key={certification.id}
                  />
                ))}
              </View>
            )}
          </MobileSection>
        </>
      ) : null}
    </MobileScrollScreen>
  );
}
