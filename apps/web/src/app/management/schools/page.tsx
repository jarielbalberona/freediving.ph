import type { Metadata } from "next";

import { ManageSchoolsPage } from "@/features/schools/pages/ManageSchoolsPage";

export const metadata: Metadata = {
  title: "Manage schools | Freediving Philippines",
};

export default function Page() {
  return <ManageSchoolsPage />;
}
