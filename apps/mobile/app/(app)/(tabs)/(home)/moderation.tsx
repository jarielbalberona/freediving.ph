import { MobileAuthRequired } from "@/components/shell/mobile-auth-required";
import { ModerationTriageScreen } from "@/features/moderation/screens/moderation-triage-screen";

export default function ModerationRoute() {
  return (
    <MobileAuthRequired>
      <ModerationTriageScreen />
    </MobileAuthRequired>
  );
}
