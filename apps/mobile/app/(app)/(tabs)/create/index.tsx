import { useAuth } from "@clerk/expo";

import { AuthScreen } from "@/features/auth/auth-screen";
import { CreateScreen } from "@/features/create/screens/create-screen";

export default function CreateRoute() {
  const { isSignedIn } = useAuth();
  return isSignedIn ? <CreateScreen /> : <AuthScreen mode="signIn" />;
}
