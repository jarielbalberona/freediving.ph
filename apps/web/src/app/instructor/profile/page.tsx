import type { Metadata } from "next";

import { InstructorApplicationPage } from "@/features/instructors/pages/InstructorApplicationPage";

export const metadata: Metadata = {
  title: "Instructor profile | Freediving Philippines",
};

export default function Page() {
  return <InstructorApplicationPage />;
}
