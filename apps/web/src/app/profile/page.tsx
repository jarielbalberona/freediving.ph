
import type { MeResponse } from "@freediving.ph/types";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { routes } from "@/lib/api/fphgo-routes";
import { fphgoFetchServer } from "@/lib/api/fphgo-fetch-server";
import { getProfileRoute } from "@/lib/routes";

export default async function ProfileRedirectPage() {
  let username: string | null = null;

  try {
    const me = await fphgoFetchServer<MeResponse>(routes.v1.me());
    username = me.username ?? null;
  } catch {
    const clerkUser = await currentUser();

    if (!clerkUser) {
      redirect("/sign-in");
    }

    username = clerkUser.username ?? null;
  }

  if (!username) {
    redirect("/profile/settings");
  }

  redirect(getProfileRoute(username));
}
