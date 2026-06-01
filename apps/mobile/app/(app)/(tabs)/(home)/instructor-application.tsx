import { MobileAuthRequired } from "@/components/shell/mobile-auth-required";
import { InstructorApplicationScreen } from "@/features/instructors/screens/instructor-application-screen";

export default function InstructorApplicationRoute() {
  return (
    <MobileAuthRequired>
      <InstructorApplicationScreen />
    </MobileAuthRequired>
  );
}
