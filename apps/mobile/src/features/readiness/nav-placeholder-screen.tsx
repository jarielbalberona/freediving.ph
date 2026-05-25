import {
  MobileEmptyState,
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";

type NavPlaceholderScreenProps = {
  description: string;
  title: string;
};

export function NavPlaceholderScreen({
  description,
  title,
}: NavPlaceholderScreenProps) {
  return (
    <MobileScrollScreen subtitle="Available soon" title={title}>
      <MobileSection title={title}>
        <MobileEmptyState description={description} title="Coming soon" />
      </MobileSection>
    </MobileScrollScreen>
  );
}
