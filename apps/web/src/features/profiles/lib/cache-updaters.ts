import type { QueryClient } from "@tanstack/react-query";
import type {
  MeResponse,
  Profile,
  ProfileResponse,
  ProfileView,
} from "@freediving.ph/types";

import { queryKeys } from "@/lib/query/query-keys";

const sessionQueryKey = queryKeys.session.current();

const patchSessionFromProfile = (
  current: MeResponse | undefined,
  profile: Profile,
) => {
  if (!current) return current;
  return {
    ...current,
    displayName: profile.displayName ?? current.displayName,
    username: profile.username ?? current.username,
  };
};

const patchProfileView = (
  current: ProfileView | undefined,
  profile: Profile,
) => {
  if (!current) return current;
  return {
    ...current,
    username: profile.username ?? current.username,
    displayName: profile.displayName ?? current.displayName,
    bio: profile.bio,
    avatarUrl: profile.avatarUrl,
  };
};

export function updateProfileInCaches(
  queryClient: QueryClient,
  response: ProfileResponse,
) {
  const profile = response.profile;
  const previousSession = queryClient.getQueryData<MeResponse>(sessionQueryKey);
  const previousProfile = queryClient.getQueryData<ProfileResponse>(
    queryKeys.profile.me(),
  );
  const previousUsername =
    previousSession?.username ?? previousProfile?.profile.username;

  queryClient.setQueryData(queryKeys.profile.me(), response);
  queryClient.setQueryData(sessionQueryKey, (current: MeResponse | undefined) =>
    patchSessionFromProfile(current, profile),
  );

  if (!profile.username) return;

  queryClient.setQueryData(
    queryKeys.profile.view(profile.username),
    (current: ProfileView | undefined) =>
      patchProfileView(current, profile),
  );

  if (previousUsername && previousUsername !== profile.username) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.profile.view(previousUsername),
    });
  }
}
