import { useAuth } from "@clerk/expo";

import { AuthScreen } from "@/features/auth/auth-screen";
import { ProfileScreen } from "@/features/profiles/screens/profile-screen";

export default function ProfileRoute() {
  const { isSignedIn } = useAuth();
  return isSignedIn ? <ProfileScreen /> : <AuthScreen mode="signIn" />;
}
