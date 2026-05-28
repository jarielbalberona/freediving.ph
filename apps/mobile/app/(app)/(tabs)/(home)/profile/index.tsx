import { useAuth } from "@clerk/expo";

import { ProfileScreen } from "@/features/profiles/screens/profile-screen";
import { PublicProfileScreen } from "@/features/profiles/screens/public-profile-screen";

export default function ProfileRoute() {
  const { isSignedIn } = useAuth();
  return isSignedIn ? <ProfileScreen /> : <PublicProfileScreen />;
}
