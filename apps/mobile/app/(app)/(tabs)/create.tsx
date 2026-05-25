import { MobileAuthRequired } from "@/components/shell/mobile-auth-required";
import { CreateScreen } from "@/features/create/screens/create-screen";

export default function CreateRoute() {
  return (
    <MobileAuthRequired>
      <CreateScreen />
    </MobileAuthRequired>
  );
}
