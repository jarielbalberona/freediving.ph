"use client";

import type {
  InstructorAgency,
  InstructorApplication,
  InstructorApplicationPayload,
  InstructorCertificationPayload,
} from "@freediving.ph/types";
import {
  Award,
  CheckCircle2,
  ExternalLink,
  FileUp,
  Plus,
  Send,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AuthGuard } from "@/components/auth/guard";
import {
  CommunityEmptyState,
  CommunityHeader,
  CommunityPageShell,
} from "@/components/community/community-page";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  instructorsApi,
  certificationStatusLabels,
  instructorAgencyLabels,
  instructorAgencyOptions,
  instructorStatusLabels,
  useCreateInstructorCertification,
  useMyInstructorApplication,
  useSaveInstructorProfile,
  useSubmitInstructorProfile,
} from "@/features/instructors";
import {
  buildDisplayLocation,
  EMPTY_LOCATION_SEARCH_VALUE,
  LocationPicker,
  type LocationSearchValue,
} from "@/features/locations";
import { useUploadMedia } from "@/features/media";
import { getApiErrorMessage } from "@/lib/http/api-error";

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

const emptyCertification: InstructorCertificationPayload = {
  agency: "molchanovs",
  agencyOtherName: "",
  certificationLevel: "",
  certificationNumber: "",
  issuedAt: "",
  expiresAt: "",
  proofMediaId: "",
  officialVerificationUrl: "",
};

const maxProofSizeBytes = 10 * 1024 * 1024;
const acceptedProofTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export function InstructorApplicationPage() {
  return (
    <AuthGuard>
      <InstructorApplicationContent />
    </AuthGuard>
  );
}

function InstructorApplicationContent() {
  const query = useMyInstructorApplication();
  const saveProfile = useSaveInstructorProfile();
  const submitProfile = useSubmitInstructorProfile();
  const createCertification = useCreateInstructorCertification();
  const uploadProof = useUploadMedia();
  const application = query.data?.application;
  const profile = application?.profile;
  const status = application?.viewerInstructorStatus;
  const certifications = application?.certifications ?? [];
  const [profileForm, setProfileForm] = useState(emptyProfile);
  const [profileLocation, setProfileLocation] = useState<LocationSearchValue>(
    EMPTY_LOCATION_SEARCH_VALUE,
  );
  const [certificationForm, setCertificationForm] =
    useState(emptyCertification);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [attestationAccepted, setAttestationAccepted] = useState(false);
  const proofPreviewUrl = useMemo(
    () =>
      proofFile?.type.startsWith("image/")
        ? URL.createObjectURL(proofFile)
        : "",
    [proofFile],
  );

  useEffect(() => {
    return () => {
      if (proofPreviewUrl) URL.revokeObjectURL(proofPreviewUrl);
    };
  }, [proofPreviewUrl]);

  useEffect(() => {
    if (!profile) return;
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
      locationSource: profile.locationSource || "manual",
      specialties: profile.specialties,
      schoolAffiliation: profile.schoolAffiliation,
      websiteUrl: profile.websiteUrl,
      socialLinks: profile.socialLinks,
      safetyCredentials: profile.safetyCredentials,
    });
    setProfileLocation(profileToLocation(profile));
  }, [profile]);

  const onSaveProfile = async () => {
    try {
      await saveProfile.mutateAsync({
        ...profileForm,
        ...locationToProfileFields(profileLocation),
      });
      toast.success("Instructor profile saved.");
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Failed to save instructor profile"),
      );
    }
  };

  const onAddCertification = async () => {
    try {
      if (!proofFile && !certificationForm.officialVerificationUrl.trim()) {
        toast.error(
          "Upload certification proof or add an official verification link.",
        );
        return;
      }
      let proofMediaId = certificationForm.proofMediaId;
      if (proofFile) {
        const upload = await uploadProof.mutateAsync({
          file: proofFile,
          contextType: "instructor_certification_proof",
        });
        proofMediaId = upload.id;
      }
      await createCertification.mutateAsync({
        ...certificationForm,
        proofMediaId,
      });
      setCertificationForm({ ...emptyCertification });
      setProofFile(null);
      toast.success("Certification added.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to add certification"));
    }
  };

  const onSubmit = async () => {
    try {
      if (!hasStructuredLocation(profileLocation)) {
        toast.error("Choose your base/home location before submitting.");
        return;
      }
      await submitProfile.mutateAsync({ attestationAccepted });
      toast.success("Instructor application submitted.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to submit application"));
    }
  };

  return (
    <CommunityPageShell>
      <CommunityHeader
        title="Instructor application"
        subtitle="Apply as an instructor by submitting your teaching credentials. FPH reviews existing instructor certifications from recognized agencies. FPH verification is for platform access only and does not replace your agency certification."
        action={
          status?.canCreateSchool ? (
            <Button size="sm" render={<Link href="/manage/schools" />}>
              <CheckCircle2 />
              Manage schools
            </Button>
          ) : null
        }
      />

      {query.isLoading ? (
        <StateText text="Loading instructor profile..." />
      ) : null}
      {query.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Instructor profile unavailable</AlertTitle>
          <AlertDescription>
            {getApiErrorMessage(
              query.error,
              "Could not load your instructor profile.",
            )}
          </AlertDescription>
        </Alert>
      ) : null}

      {!query.isLoading && application ? (
        <div className="grid gap-5">
          <section className="grid gap-3 border-y border-border/70 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={status?.canCreateSchool ? "secondary" : "outline"}
              >
                {instructorStatusLabels[status?.status ?? "none"]}
              </Badge>
              <p className="text-sm text-muted-foreground">{status?.message}</p>
            </div>
            {status?.status === "rejected" && status.rejectionReason ? (
              <Alert>
                <AlertTitle>
                  Your instructor application needs changes.
                </AlertTitle>
                <AlertDescription>{status.rejectionReason}</AlertDescription>
              </Alert>
            ) : null}
          </section>

          <section className="grid gap-4">
            <h2 className="text-base font-semibold tracking-normal">
              Instructor profile
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Display name"
                value={profileForm.displayName}
                onChange={(displayName) =>
                  setProfileForm({ ...profileForm, displayName })
                }
              />
              <Field
                label="Teaching since"
                type="date"
                value={profileForm.teachingSince}
                onChange={(teachingSince) =>
                  setProfileForm({ ...profileForm, teachingSince })
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Base/home location *</Label>
              <p className="text-sm text-muted-foreground">
                Where are you mainly based for teaching or freediving?
              </p>
              <LocationPicker
                value={profileLocation}
                onChange={setProfileLocation}
                disabled={saveProfile.isPending}
                mode="administrative"
              />
              {!hasStructuredLocation(profileLocation) &&
              profileForm.homeLocationLabel ? (
                <p className="text-xs text-muted-foreground">
                  Current saved location: {profileForm.homeLocationLabel}.
                  Choose it above before submitting.
                </p>
              ) : null}
            </div>
            <div className="grid gap-1.5">
              <Label>Bio *</Label>
              <Textarea
                value={profileForm.bio}
                onChange={(event) =>
                  setProfileForm({ ...profileForm, bio: event.target.value })
                }
                rows={5}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Specialties"
                value={profileForm.specialties}
                onChange={(specialties) =>
                  setProfileForm({ ...profileForm, specialties })
                }
              />
              <Field
                label="School affiliation"
                value={profileForm.schoolAffiliation}
                onChange={(schoolAffiliation) =>
                  setProfileForm({ ...profileForm, schoolAffiliation })
                }
              />
              <Field
                label="Website"
                value={profileForm.websiteUrl}
                onChange={(websiteUrl) =>
                  setProfileForm({ ...profileForm, websiteUrl })
                }
              />
              <Field
                label="Social links"
                value={profileForm.socialLinks}
                onChange={(socialLinks) =>
                  setProfileForm({ ...profileForm, socialLinks })
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label>First aid, CPR, emergency, or safety credentials</Label>
              <Textarea
                value={profileForm.safetyCredentials}
                onChange={(event) =>
                  setProfileForm({
                    ...profileForm,
                    safetyCredentials: event.target.value,
                  })
                }
                rows={3}
              />
            </div>
            <Button
              type="button"
              className="justify-self-start"
              onClick={() => void onSaveProfile()}
              disabled={saveProfile.isPending}
            >
              Save profile
            </Button>
          </section>

          <section className="grid gap-4 border-t border-border/70 pt-4">
	            <div className="grid gap-1">
	              <div>
	                <h2 className="text-base font-semibold tracking-normal">
	                  Certifications
                </h2>
                <p className="text-sm text-muted-foreground">
                  Add at least one instructor-level certification with readable
                  proof or an official verification/profile URL. You can add
                  certifications from agencies like Molchanovs, PADI, AIDA, SSI,
	                  RAID, Apnea Academy, or Other.
	                </p>
	              </div>
	            </div>

            <div className="grid gap-3 rounded-lg border border-border/70 p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label>Agency</Label>
                  <Select
                    items={instructorAgencyLabels}
                    value={certificationForm.agency}
                    onValueChange={(agency) =>
                      setCertificationForm({
                        ...certificationForm,
                        agency: agency as InstructorAgency,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select agency" />
                    </SelectTrigger>
                    <SelectContent>
                      {instructorAgencyOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {certificationForm.agency === "other" ? (
                  <Field
                    label="Agency name"
                    className="sm:col-span-2"
                    value={certificationForm.agencyOtherName}
                    onChange={(agencyOtherName) =>
                      setCertificationForm({
                        ...certificationForm,
                        agencyOtherName,
                      })
                    }
                  />
                ) : null}
                <Field
                  label="Certification level"
                  value={certificationForm.certificationLevel}
                  onChange={(certificationLevel) =>
                    setCertificationForm({
                      ...certificationForm,
                      certificationLevel,
                    })
                  }
                />
                <Field
                  label="Official verification link"
                  value={certificationForm.officialVerificationUrl}
                  onChange={(officialVerificationUrl) =>
                    setCertificationForm({
                      ...certificationForm,
                      officialVerificationUrl,
                    })
                  }
                />
                <Field
                  label="Certification number"
                  value={certificationForm.certificationNumber}
                  onChange={(certificationNumber) =>
                    setCertificationForm({
                      ...certificationForm,
                      certificationNumber,
                    })
                  }
                />
                <Field
                  label="Issued"
                  type="date"
                  value={certificationForm.issuedAt}
                  onChange={(issuedAt) =>
                    setCertificationForm({ ...certificationForm, issuedAt })
                  }
                />
                <Field
                  label="Expires"
                  type="date"
                  value={certificationForm.expiresAt}
                  onChange={(expiresAt) =>
                    setCertificationForm({ ...certificationForm, expiresAt })
                  }
                />
                <div className="grid gap-1.5 sm:col-span-2">
                  <Label>Certification proof</Label>
                  <p className="text-sm text-muted-foreground">
                    Upload a certificate, instructor card, or screenshot of your
                    credential.
                  </p>
                  <div className="flex flex-col gap-3 rounded-md border border-border/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {proofFile ? proofFile.name : "No proof selected"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        JPG, PNG, WebP, or GIF up to 10 MB.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        render={<label htmlFor="certification-proof-file" />}
                        disabled={
                          uploadProof.isPending || createCertification.isPending
                        }
                      >
                        <FileUp />
                        {proofFile ? "Replace proof" : "Upload proof"}
                      </Button>
                      {proofFile ? (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setProofFile(null)}
                          disabled={
                            uploadProof.isPending ||
                            createCertification.isPending
                          }
                        >
                          <X />
                          Remove
                        </Button>
                      ) : null}
                    </div>
                    <input
                      id="certification-proof-file"
                      type="file"
                      accept={acceptedProofTypes.join(",")}
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        event.target.value = "";
                        if (!file) return;
                        if (!acceptedProofTypes.includes(file.type)) {
                          toast.error(
                            "Upload an image file for certification proof.",
                          );
                          return;
                        }
                        if (file.size > maxProofSizeBytes) {
                          toast.error(
                            "Certification proof must be 10 MB or smaller.",
                          );
                          return;
                        }
                        setProofFile(file);
                      }}
                    />
                  </div>
                  {proofPreviewUrl ? (
                    <img
                      src={proofPreviewUrl}
                      alt="Selected certification proof preview"
                      className="max-h-56 w-fit rounded-md border border-border/70 object-contain"
                    />
                  ) : null}
                  <p className="text-sm text-muted-foreground">
                    If your agency has a public profile or verification page,
                    add the link here instead or include both.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                className="justify-self-start"
                onClick={() => void onAddCertification()}
                disabled={
                  createCertification.isPending || uploadProof.isPending
                }
              >
                <Plus />
                Add certification
              </Button>
            </div>

            <label className="flex gap-2 rounded-md border border-border/70 p-3 text-sm">
              <input
                type="checkbox"
                className="mt-1 size-4 shrink-0"
                checked={attestationAccepted}
                onChange={(event) =>
                  setAttestationAccepted(event.target.checked)
                }
              />
              <span className="text-muted-foreground">
                I attest that the submitted credentials are truthful, and I
                understand FPH may reject or suspend verification for false,
                expired, unverifiable, or misleading credentials. I also
                understand FPH verification is platform verification only and
                does not mean FPH issued, guarantees, or certifies the
                instructor credential.
              </span>
            </label>

            {certifications.length === 0 ? (
              <CommunityEmptyState
                title="No certifications yet"
                description="Add the agency and certification level you teach under."
              />
            ) : (
              <div className="divide-y divide-border/70 border-y border-border/70">
                {certifications.map((certification) => (
                  <div
                    key={certification.id}
                    className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Award className="size-4 text-muted-foreground" />
                        <span className="font-medium">
                          {certification.agency === "other"
                            ? certification.agencyOtherName
                            : instructorAgencyLabels[certification.agency]}{" "}
                          {certification.certificationLevel}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {certification.certificationNumber ||
                          "No certification number"}
                      </p>
                      {certification.officialVerificationUrl ? (
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {certification.officialVerificationUrl}
                        </p>
                      ) : null}
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {certification.proofMediaId ? (
                          <span>Proof uploaded</span>
                        ) : null}
                        {certification.proofMediaId ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                            onClick={() => void openProof(certification.id)}
                          >
                            <ExternalLink className="size-3" />
                            View proof
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <Badge variant="outline">
                      {
                        certificationStatusLabels[
                          certification.verificationStatus
                        ]
                      }
                    </Badge>
                  </div>
                ))}
	              </div>
	            )}
	            <div className="flex justify-end border-t border-border/70 pt-4">
	              <Button
	                type="button"
	                onClick={() => void onSubmit()}
	                disabled={
	                  submitProfile.isPending ||
	                  certifications.length === 0 ||
	                  !attestationAccepted
	                }
	              >
	                <Send />
	                Submit for review
	              </Button>
	            </div>
	          </section>
        </div>
      ) : null}
    </CommunityPageShell>
  );
}

function Field({
  label,
  value,
  type = "text",
  onChange,
  required = false,
  className,
}: {
  label: string;
  value: string;
  type?: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={`grid gap-1.5 ${className ?? ""}`}>
      <Label>{required ? `${label} *` : label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function StateText({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}

function profileToLocation(
  profile: InstructorApplication["profile"],
): LocationSearchValue {
  if (!profile) return { ...EMPTY_LOCATION_SEARCH_VALUE };
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
    buildDisplayLocation(location) ||
    location.locationName ||
    location.formattedAddress ||
    "";
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

function hasStructuredLocation(location: LocationSearchValue) {
  return Boolean(
    location.regionCode ||
      location.provinceCode ||
      location.cityCode ||
      location.barangayCode,
  );
}

function normalizeLocationSource(
  source: string,
): LocationSearchValue["locationSource"] {
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

async function openProof(certificationId: string) {
  try {
    const response =
      await instructorsApi.getMyCertificationProofUrl(certificationId);
    window.open(response.proof.url, "_blank", "noopener,noreferrer");
  } catch (error) {
    toast.error(
      getApiErrorMessage(error, "Could not open certification proof"),
    );
  }
}
