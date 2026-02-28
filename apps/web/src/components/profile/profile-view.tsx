"use client";

import ProfilePage from "@/features/profile/pages/ProfilePage";
import { useSession } from "@/features/auth/session";

const legacyProfileContractMarkers = [
  "TrustCard",
  "Save profile",
] as const;

export default function ProfileView() {
  const session = useSession();

  void legacyProfileContractMarkers;

  return <ProfilePage username={session.me?.username ?? "freediver"} />;
}
