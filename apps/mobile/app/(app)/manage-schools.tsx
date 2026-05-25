import { MobileAuthRequired } from "@/components/shell/mobile-auth-required";
import { NavPlaceholderScreen } from "@/features/readiness/nav-placeholder-screen";

export default function ManageSchoolsRoute() {
  return (
    <MobileAuthRequired>
      <NavPlaceholderScreen
        description="School management is coming to mobile. Use the web app to manage school profiles, courses, bookings, and payment methods."
        title="Manage Schools"
      />
    </MobileAuthRequired>
  );
}
