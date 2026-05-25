import { MobileAuthRequired } from "@/components/shell/mobile-auth-required";
import { MessageThreadScreen } from "@/features/messages/screens/message-thread-screen";

export default function MessageThreadRoute() {
  return (
    <MobileAuthRequired>
      <MessageThreadScreen />
    </MobileAuthRequired>
  );
}
