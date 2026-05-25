import { MobileAuthRequired } from "@/components/shell/mobile-auth-required";
import { ProfileScreen } from "@/features/profiles/screens/profile-screen";

export default function ProfileRoute() {
  return (
    <MobileAuthRequired>
      <ProfileScreen />
    </MobileAuthRequired>
  );
}
