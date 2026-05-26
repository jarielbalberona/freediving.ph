import { Column, Host, Text } from "@expo/ui";

import { MobileScrollScreen } from "@/components/shell";

export default function SearchRoute() {
  return (
    <MobileScrollScreen subtitle="Find community content" title="Search">
      <Host
        matchContents
        style={{
          flexGrow: 1,
        }}
      >
        <Column
          spacing={12}
          style={{
            backgroundColor: "#FFFFFF",
            borderColor: "#D6E8EF",
            borderRadius: 24,
            borderWidth: 1,
            padding: 20,
          }}
        >
          <Text
            textStyle={{
              color: "#0A1F2E",
              fontSize: 22,
              fontWeight: "700",
            }}
          >
            Search
          </Text>
          <Text
            textStyle={{
              color: "#0A1F2E",
              fontSize: 17,
              fontWeight: "600",
            }}
          >
            Search is coming soon.
          </Text>
          <Text
            textStyle={{
              color: "#64748B",
              fontSize: 15,
              lineHeight: 22,
            }}
          >
            You’ll be able to search dive spots, Chika posts, events, buddies,
            schools, and more.
          </Text>
        </Column>
      </Host>
    </MobileScrollScreen>
  );
}
