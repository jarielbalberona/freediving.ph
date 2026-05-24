import type { Metadata } from "next";

import { InstructorApplicationPage } from "@/features/instructors/pages/InstructorApplicationPage";

export const metadata: Metadata = {
  title: "Instructor application | Freediving Philippines",
};

export default function Page() {
  return <InstructorApplicationPage />;
}
