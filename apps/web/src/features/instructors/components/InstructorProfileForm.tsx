"use client";

import type {
  InstructorApplication,
  InstructorApplicationPayload,
  InstructorCertificationPayload,
  InstructorSubmitPayload,
} from "@freediving.ph/types";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  type LocationSearchValue,
  type LocationSource,
  EMPTY_LOCATION_SEARCH_VALUE,
  buildDisplayLocation,
} from "@/features/locations";
import { InstructorProfileDetailsFields } from "./InstructorProfileDetailsFields";
import {
  InstructorCertificationsFields,
  emptyCertificationForm,
  type InstructorCertificationFormState,
} from "./InstructorCertificationsFields";
import { InstructorProfileFormTabs } from "./InstructorProfileFormTabs";

interface InstructorProfileFormProps {
  mode: "apply" | "edit";
  application: InstructorApplication | null;
  isLoading: boolean;
  isError: boolean;
  isVerified?: boolean;
  onSaveProfile: (payload: InstructorApplicationPayload) => Promise<InstructorApplication>;
  onSubmitProfile: (payload: InstructorSubmitPayload) => Promise<InstructorApplication>;
  onCreateCertification: (payload: InstructorCertificationPayload) => Promise<unknown>;
  onDeleteCertification: (certificationId: string) => Promise<unknown>;
  onUploadProof: (file: File) => Promise<{ id: string }>;
  onOpenProof: (certificationId: string) => Promise<unknown> | void;
  onCancel?: () => void;
}

const emptyProfile: InstructorApplicationPayload = {
  displayName: "",
  bio: "",
  teachingSince: "",
  homeLocationLabel: "",
  formattedAddress: "",
  regionCode: "",
  regionName: "",
  provinceCode: "",
  provinceName: "",
  cityCode: "",
  cityName: "",
  barangayCode: "",
  barangayName: "",
  locationSource: "manual",
  specialties: "",
  schoolAffiliation: "",
  websiteUrl: "",
  socialLinks: "",
  safetyCredentials: "",
};

const acceptedProofTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const maxProofSizeBytes = 10 * 1024 * 1024;

export function InstructorProfileForm({
  mode,
  application,
  isLoading,
  isError,
  isVerified = false,
  onSaveProfile,
  onSubmitProfile,
  onCreateCertification,
  onDeleteCertification,
  onUploadProof,
  onOpenProof,
  onCancel,
}: InstructorProfileFormProps) {
  const profile = application?.profile ?? null;
  const certifications = application?.certifications ?? [];

  const [activeTab, setActiveTab] = useState("details");
  const [profileForm, setProfileForm] =
    useState<InstructorApplicationPayload>(emptyProfile);
  const [profileLocation, setProfileLocation] = useState<LocationSearchValue>(
    EMPTY_LOCATION_SEARCH_VALUE,
  );
  const [attestationAccepted, setAttestationAccepted] = useState(false);
  const [certificationForm, setCertificationForm] =
    useState<InstructorCertificationFormState>(emptyCertificationForm);
  const [certificationFormOpen, setCertificationFormOpen] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);

  useEffect(() => {
    if (!profile) {
      setProfileForm(emptyProfile);
      setProfileLocation(EMPTY_LOCATION_SEARCH_VALUE);
      setAttestationAccepted(false);
      return;
    }

    setProfileForm({
      displayName: profile.displayName,
      bio: profile.bio,
      teachingSince: profile.teachingSince,
      homeLocationLabel: profile.homeLocationLabel,
      formattedAddress: profile.formattedAddress,
      regionCode: profile.regionCode,
      regionName: profile.regionName,
      provinceCode: profile.provinceCode,
      provinceName: profile.provinceName,
      cityCode: profile.cityCode,
      cityName: profile.cityName,
      barangayCode: profile.barangayCode,
      barangayName: profile.barangayName,
      locationSource: normalizeLocationSource(profile.locationSource),
      specialties: profile.specialties,
      schoolAffiliation: profile.schoolAffiliation,
      websiteUrl: profile.websiteUrl,
      socialLinks: profile.socialLinks,
      safetyCredentials: profile.safetyCredentials,
    });
    setProfileLocation(profileToLocation(profile));
  }, [profile]);

  const hasStructuredLocation = Boolean(
    profileLocation.regionCode ||
      profileLocation.provinceCode ||
      profileLocation.cityCode ||
      profileLocation.barangayCode,
  );

  const proofPreviewUrl = useMemo(
    () =>
      proofFile?.type.startsWith("image/") ? URL.createObjectURL(proofFile) : "",
    [proofFile],
  );

  useEffect(() => {
    return () => {
      if (proofPreviewUrl) {
        URL.revokeObjectURL(proofPreviewUrl);
      }
    };
  }, [proofPreviewUrl]);

  const canSubmit =
    certifications.length > 0 && attestationAccepted && hasStructuredLocation && !isLoading;

  const handleProofFileChange = (file: File | null) => {
    if (!file) {
      setProofFile(null);
      return;
    }
    if (!acceptedProofTypes.includes(file.type)) {
      toast.error("Upload an image file for certification proof.");
      return;
    }
    if (file.size > maxProofSizeBytes) {
      toast.error("Certification proof must be 10 MB or smaller.");
      return;
    }
    setProofFile(file);
  };

  const onSave = async () => {
    try {
      await onSaveProfile({
        ...profileForm,
        ...locationToProfileFields(profileLocation),
      });
      toast.success(mode === "edit" ? "Instructor profile saved." : "Instructor profile saved as draft.");
    } catch {
      toast.error("Failed to save instructor profile.");
    }
  };

  const onSubmit = async () => {
    if (certifications.length === 0) {
      toast.error("Add at least one certification to submit your instructor profile.");
      return;
    }
    if (!attestationAccepted) {
      toast.error("You must accept the instructor attestation before submitting.");
      return;
    }
    if (!hasStructuredLocation) {
      toast.error("Choose your base/home location before submitting.");
      return;
    }

    await onSave();
    try {
      await onSubmitProfile({ attestationAccepted });
      toast.success("Instructor application submitted.");
    } catch {
      toast.error("Failed to submit instructor application.");
    }
  };

  const onAddCertification = async () => {
    if (!proofFile && !certificationForm.officialVerificationUrl.trim()) {
      toast.error("Upload certification proof or add an official verification link.");
      return;
    }
    try {
      let proofMediaId = certificationForm.proofMediaId;
      if (proofFile) {
        proofMediaId = (await onUploadProof(proofFile)).id;
      }
      await onCreateCertification({
        ...certificationForm,
        proofMediaId,
      });
      setCertificationForm({ ...emptyCertificationForm });
      setProofFile(null);
      setCertificationFormOpen(false);
      toast.success("Certification added.");
    } catch {
      toast.error("Failed to add certification.");
    }
  };

  const detailsSection = (
    <InstructorProfileDetailsFields
      value={profileForm}
      onChange={setProfileForm}
      location={profileLocation}
      onLocationChange={setProfileLocation}
      readOnly={isLoading}
    />
  );

  const certificationsSection = (
    <InstructorCertificationsFields
      mode={mode}
      certifications={certifications}
      certificationForm={certificationForm}
      certificationFormOpen={certificationFormOpen}
      proofFile={proofFile}
      proofPreviewUrl={proofPreviewUrl}
      isLoading={isLoading}
      onFormOpen={setCertificationFormOpen}
      onFormFieldChange={setCertificationForm}
      onProofFileChange={handleProofFileChange}
      onSaveDraftClear={() => {
        setCertificationForm({ ...emptyCertificationForm });
        setProofFile(null);
      }}
      onAddCertification={async () => {
        await onAddCertification();
      }}
      onDeleteCertification={async (certificationId) => {
        try {
          await onDeleteCertification(certificationId);
          toast.success("Certification removed.");
        } catch {
          toast.error("Failed to remove certification.");
        }
      }}
      onOpenProof={(certificationId) => void onOpenProof(certificationId)}
    />
  );

  return (
    <div className="grid gap-4">
      <InstructorProfileFormTabs
        tab={activeTab}
        onTabChange={setActiveTab}
        details={detailsSection}
        certifications={certificationsSection}
      />

      {mode === "apply" ? (
        <label className="flex gap-2 rounded-md border border-border/70 p-3 text-sm">
          <input
            type="checkbox"
            className="mt-1 size-4 shrink-0"
            checked={attestationAccepted}
            onChange={(event) => setAttestationAccepted(event.target.checked)}
          />
          <span className="text-muted-foreground">
            I attest that the submitted credentials are truthful, and I understand
            FPH may reject or suspend verification for false, expired, unverifiable,
            or misleading credentials. I also understand FPH verification is platform
            verification only and does not mean FPH issued, guarantees, or certifies the
            instructor credential.
          </span>
        </label>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => void onSave()}
            disabled={isLoading}
          >
            {mode === "edit" ? "Save changes" : "Save profile"}
          </Button>
          {mode === "apply" && !isVerified ? (
            <Button
              type="button"
              onClick={() => void onSubmit()}
              disabled={!canSubmit}
            >
              Submit instructor application
            </Button>
          ) : null}
          {mode === "edit" && onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
        </div>
        {mode === "apply" && certifications.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add at least one certification to submit your instructor profile.
          </p>
        ) : null}
      </div>

      {isError ? (
        <p className="text-sm text-destructive">Unable to load instructor profile.</p>
      ) : null}
    </div>
  );
}

function profileToLocation(profile: InstructorApplication["profile"]) {
  if (!profile) {
    return { ...EMPTY_LOCATION_SEARCH_VALUE };
  }
  return {
    locationName: profile.homeLocationLabel || "",
    formattedAddress: profile.formattedAddress || "",
    regionCode: profile.regionCode || "",
    regionName: profile.regionName || "",
    provinceCode: profile.provinceCode || "",
    provinceName: profile.provinceName || "",
    cityCode: profile.cityCode || "",
    cityName: profile.cityName || "",
    barangayCode: profile.barangayCode || "",
    barangayName: profile.barangayName || "",
    locationSource: normalizeLocationSource(profile.locationSource),
  };
}

function locationToProfileFields(
  location: LocationSearchValue,
): Pick<
  InstructorApplicationPayload,
  | "homeLocationLabel"
  | "formattedAddress"
  | "regionCode"
  | "regionName"
  | "provinceCode"
  | "provinceName"
  | "cityCode"
  | "cityName"
  | "barangayCode"
  | "barangayName"
  | "locationSource"
> {
  const label =
    buildDisplayLocation(location) || location.locationName || location.formattedAddress || "";
  return {
    homeLocationLabel: label,
    formattedAddress: location.formattedAddress || "",
    regionCode: location.regionCode || "",
    regionName: location.regionName || "",
    provinceCode: location.provinceCode || "",
    provinceName: location.provinceName || "",
    cityCode: location.cityCode || "",
    cityName: location.cityName || "",
    barangayCode: location.barangayCode || "",
    barangayName: location.barangayName || "",
    locationSource: location.locationSource || "manual",
  };
}

function normalizeLocationSource(
  source: string,
): LocationSource {
  if (
    source === "manual" ||
    source === "psgc" ||
    source === "google_places" ||
    source === "psgc_mapped" ||
    source === "unmapped"
  ) {
    return source;
  }
  return "manual";
}
