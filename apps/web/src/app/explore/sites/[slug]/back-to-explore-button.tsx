"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function BackToExploreButton() {
  const router = useRouter();

  const handleClick = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/explore");
  };

  return (
    <Button type="button" variant="ghost" className="w-fit gap-2 px-0 text-emerald-800 px-4" onClick={handleClick}>
      <ChevronLeft className="h-4 w-4" />
      Back
    </Button>
  );
}
