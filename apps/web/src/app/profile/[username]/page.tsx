import { redirect } from "next/navigation";

import { getProfileRoute } from "@/lib/routes";

type PageProps = {
  params: Promise<{ username: string }>;
};

export default async function LegacyProfileUsernameRoute({
  params,
}: PageProps) {
  const { username } = await params;

  redirect(getProfileRoute(username));
}
