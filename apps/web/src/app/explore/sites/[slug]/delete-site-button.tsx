"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuthGate } from "@/features/auth/auth-gate";
import { exploreApi } from "@/features/diveSpots/api/explore-v1";
import { getApiErrorMessage } from "@/lib/http/api-error";

type DeleteSiteButtonProps = {
  siteId: string;
  siteName: string;
};

export function DeleteSiteButton({ siteId, siteName }: DeleteSiteButtonProps) {
  const router = useRouter();
  const { roleIsAtLeast, isLoading } = useAuthGate();
  const canDelete = roleIsAtLeast("super_admin");

  const deleteMutation = useMutation({
    mutationFn: () => exploreApi.deleteSite(siteId),
    onSuccess: () => {
      toast.success("Dive site deleted.");
      router.push("/explore");
      router.refresh();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to delete dive site"));
    },
  });

  if (isLoading || !canDelete) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="destructive"
      size="icon-sm"
      disabled={deleteMutation.isPending}
      onClick={() => {
        const confirmed = window.confirm(
          `Delete ${siteName}? This removes it from public Explore.`,
        );
        if (confirmed) {
          deleteMutation.mutate();
        }
      }}
      aria-label={`Delete ${siteName}`}
      title="Delete dive site"
    >
      <Trash2 />
    </Button>
  );
}
