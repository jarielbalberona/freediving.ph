import { MobileAuthRequired } from "@/components/shell/mobile-auth-required";
import { ChikaPostScreen } from "@/features/chika/screens/chika-post-screen";

export default function ChikaPostRoute() {
  return (
    <MobileAuthRequired>
      <ChikaPostScreen />
    </MobileAuthRequired>
  );
}
