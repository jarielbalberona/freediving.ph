import type { MeResponse } from "@freediving.ph/types";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { routes } from "@/lib/api/fphgo-routes";
import { fphgoFetchServer } from "@/lib/api/fphgo-fetch-server";
import { getProfileSettingsRoute } from "@/lib/routes";

export default async function LegacyProfileSettingsRoute() {
  let username: string | null = null;

  try {
    const me = await fphgoFetchServer<MeResponse>(routes.v1.session());
    username = me.username ?? null;
  } catch {
    const clerkUser = await currentUser();

    if (!clerkUser) {
      redirect("/sign-in");
    }

    username = clerkUser.username ?? null;
  }

  if (!username) {
    redirect("/sign-in");
  }

  redirect(getProfileSettingsRoute(username));
}
