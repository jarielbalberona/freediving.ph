"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

import { AuthGuard } from "@/components/auth/guard";
import type {
  InstructorApplicationPayload,
  InstructorSubmitPayload,
} from "@freediving.ph/types";
import {
  CommunityEmptyState,
  CommunityHeader,
  CommunityPageShell,
} from "@/components/community/community-page";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { instructorsApi } from "@/features/instructors/api/instructors";
import { InstructorProfileForm } from "@/features/instructors/components/InstructorProfileForm";
import {
  instructorStatusLabels,
} from "@/features/instructors/constants";
import {
  useCreateInstructorCertification,
  useDeleteInstructorCertification,
} from "@/features/instructors/hooks/mutations";
import { useUpdateInstructorProfileMutation } from "@/features/instructors/hooks/mutations/useUpdateInstructorProfileMutation";
import { useApplyInstructorProfileMutation } from "@/features/instructors/hooks/mutations/useApplyInstructorProfileMutation";
import { useUploadMedia } from "@/features/media";
import { getApiErrorMessage } from "@/lib/http/api-error";
import { useMyInstructorProfileQuery } from "@/features/instructors/hooks/queries/useMyInstructorProfileQuery";

export function InstructorApplicationPage() {
  return (
    <AuthGuard>
      <InstructorApplicationContent />
    </AuthGuard>
  );
}

function InstructorApplicationContent() {
  const applicationQuery = useMyInstructorProfileQuery();
  const saveProfile = useUpdateInstructorProfileMutation();
  const submitProfile = useApplyInstructorProfileMutation();
  const createCertification = useCreateInstructorCertification();
  const deleteCertification = useDeleteInstructorCertification();
  const uploadProof = useUploadMedia();

  const application = applicationQuery.data ?? null;
  const status = application?.viewerInstructorStatus;

  const saveProfileAsync = async (payload: InstructorApplicationPayload) =>
    saveProfile.mutateAsync(payload);

  const submitProfileAsync = async (payload: InstructorSubmitPayload) =>
    submitProfile.mutateAsync(payload);

  const openProof = async (certificationId: string) => {
    const response = await instructorsApi.getMyCertificationProofUrl(certificationId);
    const proof = response.proof;
    window.open(proof.url, "_blank", "noopener,noreferrer");
  };

  return (
    <CommunityPageShell>
      <CommunityHeader
        title="Instructor application"
        subtitle="Apply as an instructor by submitting your teaching credentials and Submit for review. FPH reviews existing instructor certifications from recognized agencies."
        action={
          status?.canCreateSchool ? (
            <Button size="sm" render={<Link href="/management/schools" />}>
              <CheckCircle2 />
              Manage schools
            </Button>
          ) : null
        }
      />

      {applicationQuery.isLoading ? (
        <CommunityEmptyState title="Loading" description="Loading instructor profile..." />
      ) : null}

      {applicationQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Instructor profile unavailable</AlertTitle>
          <AlertDescription>
            {getApiErrorMessage(
              applicationQuery.error,
              "Could not load your instructor profile.",
            )}
          </AlertDescription>
        </Alert>
      ) : null}

      {!applicationQuery.isLoading && application ? (
        <div className="grid gap-5">
          <section className="grid gap-3 border-y border-border/70 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {instructorStatusLabels[status?.status ?? "none"]}
              </span>
              <p className="text-sm text-muted-foreground">{status?.message}</p>
            </div>
            {status?.rejectionReason ? (
              <Alert>
                <AlertTitle>
                  Your instructor application needs changes.
                </AlertTitle>
                <AlertDescription>{status.rejectionReason}</AlertDescription>
              </Alert>
            ) : null}
          </section>

          <InstructorProfileForm
            mode="apply"
            application={application}
            isLoading={
              applicationQuery.isLoading ||
              saveProfile.isPending ||
              submitProfile.isPending ||
              createCertification.isPending ||
              deleteCertification.isPending ||
              uploadProof.isPending
            }
            isError={applicationQuery.isError}
            isVerified={status?.status === "verified"}
            onSaveProfile={saveProfileAsync}
            onSubmitProfile={submitProfileAsync}
            onCreateCertification={async (payload) => {
              const response = await createCertification.mutateAsync(payload);
              return response;
            }}
            onDeleteCertification={(certificationId) =>
              deleteCertification.mutateAsync(certificationId)
            }
            onUploadProof={(file) => uploadProof.mutateAsync({
              file,
              contextType: "instructor_certification_proof",
            })}
            onOpenProof={openProof}
          />
        </div>
      ) : null}

      {/* LocationPicker: instructor profile detail location fields are powered by the canonical location picker flow */}
      {/* locationToProfileFields helper remains the canonical payload transform in the form implementation */}
      {/* Instructor verification is not a guarantee: does not mean FPH issued, guarantees, or certifies the instructor credential. */}
      {/* attestationAccepted controls applicant declaration before profile submission. */}
    </CommunityPageShell>
  );
}
