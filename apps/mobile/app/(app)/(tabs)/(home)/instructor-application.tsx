import { MobileAuthRequired } from "@/components/shell/mobile-auth-required";
import { NavPlaceholderScreen } from "@/features/readiness/nav-placeholder-screen";

export default function InstructorApplicationRoute() {
  return (
    <MobileAuthRequired>
      <NavPlaceholderScreen
        description="Instructor applications are coming to mobile. Use the web app to submit or update an application."
        title="Instructor Application"
      />
    </MobileAuthRequired>
  );
}
