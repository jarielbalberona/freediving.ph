import { cookies } from "next/headers";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { serverAPICall } from "@/lib/api";
import ProfileView from "@/components/profile/profile-view";
import { queryClient } from "@/lib/react-query";

export default async function Profile() {
  const cookieStore = await cookies();

  const profile = await serverAPICall("/auth/me", {
    headers: { Cookie: cookieStore.toString() },
  });

  await queryClient.prefetchQuery({
    queryKey: ["profile"],
    queryFn: () =>
    serverAPICall("/auth/me", {
      headers: { Cookie: cookieStore.toString() },
      credentials: "include",
    }),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProfileView initialData={profile} />
    </HydrationBoundary>
  );
}
