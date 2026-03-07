"use client";

import { useUser } from "@clerk/nextjs";

import { useSession } from "@/features/auth/session";
import { getProfileFallbackRoute, getProfileRoute } from "@/lib/routes";

export const useCurrentProfileHref = (): string => {
  const session = useSession();
  const { user } = useUser();
  const username = session.me?.username ?? user?.username ?? null;

  return username ? getProfileRoute(username) : getProfileFallbackRoute();
};
