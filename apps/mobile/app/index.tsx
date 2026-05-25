import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";

import { MobileLoadingState } from "@/components/shell/mobile-loading-state";

export default function IndexRoute() {
  const { isLoaded } = useAuth();

  if (!isLoaded) {
    return <MobileLoadingState message="Preparing Freediving Philippines." />;
  }

  return <Redirect href="/(app)/(tabs)/(home)" />;
}
