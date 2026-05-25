import { MobileAuthRequired } from "@/components/shell/mobile-auth-required";
import { NavPlaceholderScreen } from "@/features/readiness/nav-placeholder-screen";

export default function CreateRoute() {
  return (
    <MobileAuthRequired>
      <NavPlaceholderScreen
        description="Posting from mobile is coming soon. Use Chika on the web app to create a post today."
        title="Post"
      />
    </MobileAuthRequired>
  );
}
