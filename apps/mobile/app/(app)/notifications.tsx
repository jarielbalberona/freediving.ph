import { MobileAuthRequired } from "@/components/shell/mobile-auth-required";
import { NotificationsScreen } from "@/features/notifications/screens/notifications-screen";

export default function NotificationsRoute() {
  return (
    <MobileAuthRequired>
      <NotificationsScreen />
    </MobileAuthRequired>
  );
}
