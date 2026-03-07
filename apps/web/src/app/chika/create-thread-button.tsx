"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function CreateThreadButton() {
  const { user } = useUser();
  const router = useRouter();

  const handleClick = () => {
    if (!user) {
      router.push("/sign-in");
      return;
    }
    router.push("/chika/create");
  };

  return (
    <Button onClick={handleClick} className="flex items-center gap-2">
      <Plus className="w-4 h-4" />
      New Chika
    </Button>
  );
}
