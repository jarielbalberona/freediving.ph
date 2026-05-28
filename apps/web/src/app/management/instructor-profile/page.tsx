"use client";

import Link from "next/link";
import { useState } from "react";

import { GraduationCap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth/session";
import {
  CommunityEmptyState,
  CommunityHeader,
} from "@/components/community/community-page";
import { ManagementPageContainer } from "@/components/layout/management-page-container";
import { InstructorProfileFormTabs } from "@/features/instructors/components/InstructorProfileFormTabs";
import { InstructorProfileForm } from "@/features/instructors/components/InstructorProfileForm";
import {
  InstructorCertificationsFields,
} from "@/features/instructors/components/InstructorCertificationsFields";
import { InstructorProfileDisplayOnlyFields } from "@/features/instructors/components/InstructorProfileDetailsFields";
import { instructorsApi } from "@/features/instructors/api/instructors";
import { instructorStatusLabels } from "@/features/instructors/constants";
import {
  useCreateInstructorCertification,
  useDeleteInstructorCertification,
} from "@/features/instructors/hooks/mutations";
import { useUpdateInstructorProfileMutation } from "@/features/instructors/hooks/mutations/useUpdateInstructorProfileMutation";
import { useUploadMedia } from "@/features/media";
import { useMyInstructorProfileQuery } from "@/features/instructors/hooks/queries/useMyInstructorProfileQuery";
import type { InstructorApplication } from "@freediving.ph/types";

export default function ManagementInstructorProfilePage() {
  const session = useSession();
  const instructorQuery = useMyInstructorProfileQuery();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  const updateProfile = useUpdateInstructorProfileMutation();
  const createCertification = useCreateInstructorCertification();
  const deleteCertification = useDeleteInstructorCertification();
  const uploadProof = useUploadMedia();

  const application = instructorQuery.data;
  const profile = application?.profile;
  const status = application?.viewerInstructorStatus;

  if (session.status === "loading") {
    return null;
  }

  if (session.status !== "signed_in") {
    return (
      <ManagementPageContainer variant="wide">
        <CommunityEmptyState
          title="Instructor Profile"
          description="Sign in to manage your instructor profile."
        />
      </ManagementPageContainer>
    );
  }

  if (!profile) {
    return (
      <ManagementPageContainer variant="wide">
        <CommunityHeader
          title="Instructor Profile"
          subtitle="Complete instructor setup to create or join schools and publish classes."
        />
        <CommunityEmptyState
          title="Instructor Profile"
          description="You do not have an instructor profile yet."
          action={
            <Button size="sm" variant="outline" render={<Link href="/instructor/apply" />}>
              Apply to become an instructor
            </Button>
          }
        />
      </ManagementPageContainer>
    );
  }

  const onOpenProof = async (certificationId: string) => {
    const response = await instructorsApi.getMyCertificationProofUrl(certificationId);
    window.open(response.proof.url, "_blank", "noopener,noreferrer");
  };

  const detailsSection = (
    <div className="grid gap-3 rounded-lg border border-border/70 p-4">
      <InstructorProfileDisplayOnlyFields profile={profile} />
      <p className="text-sm text-muted-foreground">
        Verification: {instructorStatusLabels[status?.status ?? "none"]}
      </p>
      {profile.verificationStatus === "rejected" && status?.rejectionReason ? (
        <p className="text-sm text-destructive">{status.rejectionReason}</p>
      ) : null}
      <p className="text-sm text-muted-foreground">
        Teaching certifications are managed in the Certifications tab.
      </p>
    </div>
  );

  const certificationsSection = (
    <InstructorCertificationsFields
      mode="edit"
      readOnly
      certifications={application?.certifications ?? []}
      certificationForm={{
        agency: "molchanovs",
        agencyOtherName: "",
        certificationLevel: "",
        certificationNumber: "",
        issuedAt: "",
        expiresAt: "",
        officialVerificationUrl: "",
        proofMediaId: "",
      }}
      certificationFormOpen={false}
      proofFile={null}
      proofPreviewUrl=""
      isLoading={
        instructorQuery.isLoading ||
        createCertification.isPending ||
        deleteCertification.isPending
      }
      onFormOpen={() => {}}
      onFormFieldChange={() => {}}
      onProofFileChange={() => {}}
      onSaveDraftClear={() => {}}
      onAddCertification={async () => {}}
      onDeleteCertification={async () => {}}
      onOpenProof={onOpenProof}
    />
  );

  return (
    <ManagementPageContainer variant="wide">
      <CommunityHeader
        title="Instructor Profile"
        subtitle="Manage your instructor profile details and certifications."
        action={
          !isEditing ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                nativeButton={false}
                render={<Link href={`/instructors/${profile.username}`} />}
              >
                <GraduationCap className="size-4" />
                Open public profile
              </Button>
            </div>
          ) : null
        }
      />

      {isEditing ? (
        <InstructorProfileForm
          mode="edit"
          application={application}
          isLoading={
            instructorQuery.isLoading ||
            updateProfile.isPending ||
            createCertification.isPending ||
            deleteCertification.isPending ||
            uploadProof.isPending
          }
          isError={instructorQuery.isError}
          onSaveProfile={async (payload) => {
            const result = await updateProfile.mutateAsync(payload);
            setIsEditing(false);
            return result;
          }}
          onSubmitProfile={async () => application as InstructorApplication}
          onCreateCertification={(payload) =>
            createCertification.mutateAsync(payload)
          }
          onDeleteCertification={(certificationId) =>
            deleteCertification.mutateAsync(certificationId)
          }
          onUploadProof={(file) =>
            uploadProof.mutateAsync({
              file,
              contextType: "instructor_certification_proof",
            })
          }
          onOpenProof={onOpenProof}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <InstructorProfileFormTabs
          tab={activeTab}
          onTabChange={setActiveTab}
          details={detailsSection}
          certifications={certificationsSection}
        />
      )}
    </ManagementPageContainer>
  );
}
