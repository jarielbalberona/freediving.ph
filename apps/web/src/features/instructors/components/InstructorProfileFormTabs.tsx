"use client";

import type { ReactNode } from "react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export function InstructorProfileFormTabs({
  tab,
  onTabChange,
  details,
  certifications,
}: {
  tab: string;
  onTabChange: (tab: string) => void;
  details: ReactNode;
  certifications: ReactNode;
}) {
  return (
    <Tabs value={tab} onValueChange={onTabChange} className="grid gap-3">
      <TabsList>
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="certifications">Certifications</TabsTrigger>
      </TabsList>
      <TabsContent value="details">{details}</TabsContent>
      <TabsContent value="certifications">{certifications}</TabsContent>
    </Tabs>
  );
}
