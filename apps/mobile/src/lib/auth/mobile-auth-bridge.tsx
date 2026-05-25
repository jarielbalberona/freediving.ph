import { useAuth } from "@clerk/expo";
import { useEffect } from "react";

import { setMobileAuthTokenGetter } from "@/lib/auth/mobile-auth-token";

export function MobileAuthBridge({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) {
      setMobileAuthTokenGetter(null);
      return;
    }

    setMobileAuthTokenGetter(getToken);
    return () => setMobileAuthTokenGetter(null);
  }, [getToken, isLoaded]);

  return <>{children}</>;
}
