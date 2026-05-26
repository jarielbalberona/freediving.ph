import {
  MobileEmptyState,
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";

export default function SearchRoute() {
  return (
    <MobileScrollScreen subtitle="Find community content" title="Search">
      <MobileSection
        description="You’ll be able to search dive spots, Chika posts, events, buddies, schools, and more."
        title="Search"
      >
        <MobileEmptyState
          description="You’ll be able to search dive spots, Chika posts, events, buddies, schools, and more."
          title="Search is coming soon."
        />
      </MobileSection>
    </MobileScrollScreen>
  );
}
