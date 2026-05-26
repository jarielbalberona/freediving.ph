import { MobileAuthRequired } from "@/components/shell/mobile-auth-required";
import { SettingsScreen } from "@/features/auth/screens/settings-screen";

export default function SettingsRoute() {
  return (
    <MobileAuthRequired>
      <SettingsScreen />
    </MobileAuthRequired>
  );
}
