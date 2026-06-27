import { useAuth } from "@clerk/expo";

import { AuthScreen } from "@/features/auth/auth-screen";
import { MessagesScreen } from "@/features/messages/screens/messages-screen";

export default function MessagesRoute() {
  const { isSignedIn } = useAuth();
  return isSignedIn ? <MessagesScreen /> : <AuthScreen mode="signIn" />;
}
