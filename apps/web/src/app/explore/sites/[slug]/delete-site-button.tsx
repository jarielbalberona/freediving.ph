"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useAuthGate } from "@/features/auth/auth-gate";
import { exploreApi } from "@/features/diveSpots/api/explore-v1";
import { getApiErrorMessage } from "@/lib/http/api-error";
import { queryKeys } from "@/lib/query/query-keys";

type DeleteSiteButtonProps = {
  siteId: string;
  siteName: string;
};

export function DeleteSiteButton({ siteId, siteName }: DeleteSiteButtonProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { roleIsAtLeast, isLoading } = useAuthGate();
  const canDelete = roleIsAtLeast("super_admin");

  const deleteMutation = useMutation({
    mutationFn: () => exploreApi.deleteSite(siteId),
    onSuccess: () => {
      queryClient.setQueriesData(
        { queryKey: queryKeys.explore.lists() },
        (current: any) => {
          if (!current?.pages) return current;
          return {
            ...current,
            pages: current.pages.map((page: any) => ({
              ...page,
              items: (page.items ?? []).filter(
                (item: any) => item.id !== siteId,
              ),
            })),
          };
        },
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.explore.lists(),
      });
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
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            type="button"
            variant="destructive"
            size="icon-sm"
            disabled={deleteMutation.isPending}
            aria-label={`Delete ${siteName}`}
            title="Delete dive site"
          />
        }
      >
        <Trash2 />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete dive site?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes {siteName} from public Explore. Existing linked media
            stays preserved, but the dive site will no longer appear as an
            approved public listing.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate()}
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
