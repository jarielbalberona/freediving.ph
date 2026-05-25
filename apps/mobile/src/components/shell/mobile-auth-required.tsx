import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";

import { MobileLoadingState } from "@/components/shell/mobile-loading-state";

type MobileAuthRequiredProps = {
  children: React.ReactNode;
};

export function MobileAuthRequired({ children }: MobileAuthRequiredProps) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <MobileLoadingState message="Checking your session." />;
  }

  if (!isSignedIn) {
    return <Redirect href="/sign-in" />;
  }

  return children;
}
