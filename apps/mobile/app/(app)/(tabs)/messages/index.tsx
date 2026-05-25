import { MobileAuthRequired } from "@/components/shell/mobile-auth-required";
import { MessagesScreen } from "@/features/messages/screens/messages-screen";

export default function MessagesRoute() {
  return (
    <MobileAuthRequired>
      <MessagesScreen />
    </MobileAuthRequired>
  );
}
