import { MobileAuthRequired } from "@/components/shell/mobile-auth-required";
import { SchoolManagementScreen } from "@/features/schools/screens/school-management-screen";

export default function ManageSchoolsRoute() {
  return (
    <MobileAuthRequired>
      <SchoolManagementScreen />
    </MobileAuthRequired>
  );
}
