import { MobileAuthRequired } from "@/components/shell/mobile-auth-required";
import { NavPlaceholderScreen } from "@/features/readiness/nav-placeholder-screen";

export default function MessagesRoute() {
  return (
    <MobileAuthRequired>
      <NavPlaceholderScreen
        description="Messages are coming soon on mobile. Use the web app for conversations for now."
        title="Messages"
      />
    </MobileAuthRequired>
  );
}
