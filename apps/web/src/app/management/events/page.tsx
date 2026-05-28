import type { Metadata } from "next";

import { ManagementEventsListPage } from "@/features/events/components/management-events-list-page";

export const metadata: Metadata = {
  title: "Management events | Freediving Philippines",
};

export default function Page() {
  return <ManagementEventsListPage />;
}
