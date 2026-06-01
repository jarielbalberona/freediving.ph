import { useAuth } from "@clerk/expo";
import type { ImagePickerAsset } from "expo-image-picker";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import type {
  InstructorAgency,
  InstructorApplicationPayload,
  InstructorCertification,
  InstructorCertificationPayload,
} from "@freediving.ph/types";

import {
  MobileEmptyState,
  MobileErrorState,
  MobileLoadingState,
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";
import { uploadMediaFiles } from "@/features/media/api/media-api";
import {
  filenameForAsset,
  mimeTypeForAsset,
  validatePhotoAsset,
} from "@/features/media/lib/media-upload-guards";
import {
  CertificationRow,
  hasStructuredLocation,
  instructorAgencyOptions,
  instructorStatusLabels,
} from "@/features/instructors/components/instructor-ui";
import {
  useDeleteInstructorCertificationMutation,
  useInstructorCertificationMutation,
  useSaveInstructorProfileMutation,
  useSubmitInstructorProfileMutation,
} from "@/features/instructors/hooks/use-instructor-mutations";
import { useMyInstructorApplicationQuery } from "@/features/instructors/hooks/use-instructors-query";

const emptyProfile: InstructorApplicationPayload = {
  barangayCode: "",
  barangayName: "",
  bio: "",
  cityCode: "",
  cityName: "",
  displayName: "",
  formattedAddress: "",
  homeLocationLabel: "",
  locationSource: "manual",
  provinceCode: "",
  provinceName: "",
  regionCode: "",
  regionName: "",
  safetyCredentials: "",
  schoolAffiliation: "",
  socialLinks: "",
  specialties: "",
  teachingSince: "",
  websiteUrl: "",
};

const emptyCertification: InstructorCertificationPayload = {
  agency: "molchanovs",
  agencyOtherName: "",
  certificationLevel: "",
  certificationNumber: "",
  expiresAt: "",
  issuedAt: "",
  officialVerificationUrl: "",
  proofMediaId: "",
};

const nativeFileFromAsset = (asset: ImagePickerAsset, fallbackPrefix: string) => ({
  name: filenameForAsset(asset, fallbackPrefix),
  type: mimeTypeForAsset(asset),
  uri: asset.uri,
});

function Field({
  label,
  multiline,
  onChangeText,
  placeholder,
  value,
}: {
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <View className="gap-1">
      <Text className="text-xs font-semibold text-muted-foreground">{label}</Text>
      <TextInput
        className={`rounded-2xl border border-border bg-background px-4 text-foreground ${
          multiline ? "min-h-24 py-3" : "min-h-11"
        }`}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder ?? label}
        placeholderTextColor="#64748b"
        value={value}
      />
    </View>
  );
}

function AgencyChip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      className={`min-h-10 justify-center rounded-full border px-3 ${
        active ? "border-primary bg-primary/10" : "border-border bg-secondary"
      }`}
      onPress={onPress}
    >
      <Text
        className={`text-xs font-semibold ${
          active ? "text-primary" : "text-secondary-foreground"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function InstructorApplicationScreen() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const applicationQuery = useMyInstructorApplicationQuery(isLoaded && Boolean(isSignedIn));
  const application = applicationQuery.data?.application;
  const profile = application?.profile ?? null;
  const certifications = application?.certifications ?? [];
  const status =
    application?.viewerInstructorStatus.status ??
    profile?.verificationStatus ??
    "none";
  const [profileForm, setProfileForm] =
    useState<InstructorApplicationPayload>(emptyProfile);
  const [certificationForm, setCertificationForm] =
    useState<InstructorCertificationPayload>(emptyCertification);
  const [editingCertificationId, setEditingCertificationId] = useState<string | null>(null);
  const [proofAsset, setProofAsset] = useState<ImagePickerAsset | undefined>();
  const [showCertificationForm, setShowCertificationForm] = useState(false);
  const [attestationAccepted, setAttestationAccepted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const saveProfile = useSaveInstructorProfileMutation();
  const submitProfile = useSubmitInstructorProfileMutation();
  const saveCertification = useInstructorCertificationMutation();
  const deleteCertification = useDeleteInstructorCertificationMutation();

  useEffect(() => {
    if (!profile) return;
    setProfileForm({
      barangayCode: profile.barangayCode,
      barangayName: profile.barangayName,
      bio: profile.bio,
      cityCode: profile.cityCode,
      cityName: profile.cityName,
      displayName: profile.displayName,
      formattedAddress: profile.formattedAddress,
      homeLocationLabel: profile.homeLocationLabel,
      locationSource: profile.locationSource || "manual",
      provinceCode: profile.provinceCode,
      provinceName: profile.provinceName,
      regionCode: profile.regionCode,
      regionName: profile.regionName,
      safetyCredentials: profile.safetyCredentials,
      schoolAffiliation: profile.schoolAffiliation,
      socialLinks: profile.socialLinks,
      specialties: profile.specialties,
      teachingSince: profile.teachingSince,
      websiteUrl: profile.websiteUrl,
    });
  }, [profile]);

  const updateProfile = (patch: Partial<InstructorApplicationPayload>) =>
    setProfileForm((current) => ({ ...current, ...patch }));

  const updateCertification = (patch: Partial<InstructorCertificationPayload>) =>
    setCertificationForm((current) => ({ ...current, ...patch }));

  const resetCertificationForm = () => {
    setCertificationForm(emptyCertification);
    setEditingCertificationId(null);
    setProofAsset(undefined);
    setShowCertificationForm(false);
  };

  const chooseProof = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync(false);
    if (!permission.granted) {
      setMessage("Allow photo library access to choose certification proof.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      allowsMultipleSelection: false,
      mediaTypes: ["images"],
      quality: 0.9,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    const error = asset ? validatePhotoAsset(asset) : "Choose a proof image.";
    if (error) {
      setMessage(error);
      return;
    }
    setProofAsset(asset);
    setMessage("Certification proof selected.");
  };

  const saveProfileDraft = async () => {
    try {
      await saveProfile.mutateAsync(profileForm);
      setMessage("Instructor profile saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save profile.");
    }
  };

  const submitApplication = async () => {
    if (status === "verified" || status === "pending") return;
    if (!hasStructuredLocation(profileForm)) {
      setMessage("Add at least one structured location code before submitting.");
      return;
    }
    if (certifications.length === 0) {
      setMessage("Add at least one certification before submitting.");
      return;
    }
    if (!attestationAccepted) {
      setMessage("Accept the instructor attestation before submitting.");
      return;
    }
    try {
      await saveProfile.mutateAsync(profileForm);
      await submitProfile.mutateAsync({ attestationAccepted: true });
      setMessage("Instructor application submitted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to submit application.");
    }
  };

  const submitCertification = async () => {
    if (!certificationForm.certificationLevel.trim()) {
      setMessage("Certification level is required.");
      return;
    }
    if (
      !proofAsset &&
      !certificationForm.proofMediaId.trim() &&
      !certificationForm.officialVerificationUrl.trim()
    ) {
      setMessage("Upload proof or add an official verification link.");
      return;
    }
    try {
      let proofMediaId = certificationForm.proofMediaId.trim();
      if (proofAsset) {
        const token = await getToken();
        if (!token) {
          setMessage("Sign in to upload certification proof.");
          return;
        }
        const upload = await uploadMediaFiles(
          [nativeFileFromAsset(proofAsset, "instructor-certification-proof")],
          "instructor_certification_proof",
          token,
        );
        proofMediaId = upload.items[0]?.id ?? "";
        if (!proofMediaId) {
          setMessage("Certification proof upload did not return media.");
          return;
        }
      }
      await saveCertification.mutateAsync({
        certificationId: editingCertificationId ?? undefined,
        payload: {
          ...certificationForm,
          agencyOtherName:
            certificationForm.agency === "other"
              ? certificationForm.agencyOtherName
              : "",
          proofMediaId,
        },
      });
      setMessage(editingCertificationId ? "Certification updated." : "Certification added.");
      resetCertificationForm();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save certification.");
    }
  };

  const editCertification = (certification: InstructorCertification) => {
    setCertificationForm({
      agency: certification.agency,
      agencyOtherName: certification.agencyOtherName,
      certificationLevel: certification.certificationLevel,
      certificationNumber: certification.certificationNumber,
      expiresAt: certification.expiresAt,
      issuedAt: certification.issuedAt,
      officialVerificationUrl: certification.officialVerificationUrl ?? "",
      proofMediaId: certification.proofMediaId ?? "",
    });
    setEditingCertificationId(certification.id);
    setProofAsset(undefined);
    setShowCertificationForm(true);
  };

  const confirmDeleteCertification = (certificationId: string) => {
    Alert.alert("Remove certification", "Remove this instructor certification?", [
      { style: "cancel", text: "Keep" },
      {
        style: "destructive",
        text: "Remove",
        onPress: () => {
          void deleteCertification.mutateAsync(certificationId).catch((error) => {
            setMessage(error instanceof Error ? error.message : "Failed to remove certification.");
          });
        },
      },
    ]);
  };

  return (
    <MobileScrollScreen subtitle="Instructor verification" title="Instructor">
      {!isSignedIn ? (
        <MobileEmptyState
          description="Sign in to manage your instructor application."
          title="Authentication required"
        />
      ) : null}
      {applicationQuery.isLoading ? (
        <MobileLoadingState message="Loading instructor profile." />
      ) : null}
      {applicationQuery.error ? (
        <MobileErrorState
          message="Your instructor profile could not be loaded."
          title="Instructor profile unavailable"
        />
      ) : null}

      {isSignedIn && !applicationQuery.isLoading && !applicationQuery.error ? (
        <>
          <MobileSection title="Status">
            <View className="gap-2 rounded-2xl border border-border bg-card p-4">
              <Text className="text-lg font-semibold text-foreground">
                {instructorStatusLabels[status]}
              </Text>
              <Text className="text-sm text-muted-foreground">
                {application?.viewerInstructorStatus.message ||
                  "Save your instructor profile and certifications before submitting."}
              </Text>
              {application?.viewerInstructorStatus.rejectionReason ? (
                <Text className="text-sm text-destructive">
                  {application.viewerInstructorStatus.rejectionReason}
                </Text>
              ) : null}
              <Text className="text-sm text-muted-foreground">
                School creation eligibility is backend-owned. Approved instructors may belong to multiple schools.
              </Text>
            </View>
          </MobileSection>

          <MobileSection title="Profile details">
            <View className="gap-3 rounded-2xl border border-border bg-card p-4">
              <Field
                label="Display name"
                onChangeText={(displayName) => updateProfile({ displayName })}
                value={profileForm.displayName}
              />
              <Field
                label="Bio"
                multiline
                onChangeText={(bio) => updateProfile({ bio })}
                value={profileForm.bio}
              />
              <Field
                label="Teaching since YYYY-MM-DD"
                onChangeText={(teachingSince) => updateProfile({ teachingSince })}
                value={profileForm.teachingSince}
              />
              <Field
                label="Base/home location label"
                onChangeText={(homeLocationLabel) =>
                  updateProfile({ homeLocationLabel })
                }
                value={profileForm.homeLocationLabel}
              />
              <Field
                label="Formatted address"
                onChangeText={(formattedAddress) =>
                  updateProfile({ formattedAddress })
                }
                value={profileForm.formattedAddress}
              />
              <View className="gap-2 rounded-2xl border border-border bg-background p-3">
                <Text className="text-sm font-semibold text-foreground">
                  Structured location codes
                </Text>
                <Text className="text-sm text-muted-foreground">
                  Backend requires at least one code before submission.
                </Text>
                <Field
                  label="Region code"
                  onChangeText={(regionCode) => updateProfile({ regionCode })}
                  value={profileForm.regionCode}
                />
                <Field
                  label="Province code"
                  onChangeText={(provinceCode) => updateProfile({ provinceCode })}
                  value={profileForm.provinceCode}
                />
                <Field
                  label="City code"
                  onChangeText={(cityCode) => updateProfile({ cityCode })}
                  value={profileForm.cityCode}
                />
                <Field
                  label="Barangay code"
                  onChangeText={(barangayCode) => updateProfile({ barangayCode })}
                  value={profileForm.barangayCode}
                />
              </View>
              <Field
                label="Specialties"
                multiline
                onChangeText={(specialties) => updateProfile({ specialties })}
                value={profileForm.specialties}
              />
              <Field
                label="School affiliation"
                onChangeText={(schoolAffiliation) =>
                  updateProfile({ schoolAffiliation })
                }
                value={profileForm.schoolAffiliation}
              />
              <Field
                label="Website"
                onChangeText={(websiteUrl) => updateProfile({ websiteUrl })}
                value={profileForm.websiteUrl}
              />
              <Field
                label="Social links"
                multiline
                onChangeText={(socialLinks) => updateProfile({ socialLinks })}
                value={profileForm.socialLinks}
              />
              <Field
                label="Safety credentials"
                multiline
                onChangeText={(safetyCredentials) =>
                  updateProfile({ safetyCredentials })
                }
                value={profileForm.safetyCredentials}
              />
              <MobileButton
                disabled={saveProfile.isPending}
                onPress={saveProfileDraft}
              >
                {saveProfile.isPending ? "Saving..." : "Save profile"}
              </MobileButton>
            </View>
          </MobileSection>

          <MobileSection title="Certifications">
            <View className="gap-3">
              {certifications.length === 0 ? (
                <MobileEmptyState
                  description="Add at least one certification before submitting."
                  title="No certifications"
                />
              ) : (
                certifications.map((certification) => (
                  <View className="gap-2" key={certification.id}>
                    <CertificationRow certification={certification} />
                    <View className="flex-row flex-wrap gap-2">
                      <MobileButton
                        variant="secondary"
                        onPress={() => editCertification(certification)}
                      >
                        Edit
                      </MobileButton>
                      <MobileButton
                        disabled={deleteCertification.isPending}
                        variant="danger"
                        onPress={() => confirmDeleteCertification(certification.id)}
                      >
                        Remove
                      </MobileButton>
                    </View>
                  </View>
                ))
              )}
              {!showCertificationForm ? (
                <MobileButton
                  variant="secondary"
                  onPress={() => setShowCertificationForm(true)}
                >
                  Add certification
                </MobileButton>
              ) : (
                <View className="gap-3 rounded-2xl border border-border bg-card p-4">
                  <Text className="font-semibold text-foreground">
                    {editingCertificationId ? "Edit certification" : "Add certification"}
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {instructorAgencyOptions.map(([value, label]) => (
                      <AgencyChip
                        active={certificationForm.agency === value}
                        key={value}
                        label={label}
                        onPress={() => updateCertification({ agency: value })}
                      />
                    ))}
                  </View>
                  {certificationForm.agency === "other" ? (
                    <Field
                      label="Agency name"
                      onChangeText={(agencyOtherName) =>
                        updateCertification({ agencyOtherName })
                      }
                      value={certificationForm.agencyOtherName}
                    />
                  ) : null}
                  <Field
                    label="Certification level"
                    onChangeText={(certificationLevel) =>
                      updateCertification({ certificationLevel })
                    }
                    value={certificationForm.certificationLevel}
                  />
                  <Field
                    label="Certification number"
                    onChangeText={(certificationNumber) =>
                      updateCertification({ certificationNumber })
                    }
                    value={certificationForm.certificationNumber}
                  />
                  <Field
                    label="Issued at YYYY-MM-DD"
                    onChangeText={(issuedAt) => updateCertification({ issuedAt })}
                    value={certificationForm.issuedAt}
                  />
                  <Field
                    label="Expires at YYYY-MM-DD"
                    onChangeText={(expiresAt) => updateCertification({ expiresAt })}
                    value={certificationForm.expiresAt}
                  />
                  <Field
                    label="Official verification URL"
                    onChangeText={(officialVerificationUrl) =>
                      updateCertification({ officialVerificationUrl })
                    }
                    value={certificationForm.officialVerificationUrl}
                  />
                  <MobileButton variant="secondary" onPress={chooseProof}>
                    {proofAsset || certificationForm.proofMediaId
                      ? "Replace proof"
                      : "Choose proof image"}
                  </MobileButton>
                  <View className="flex-row flex-wrap gap-2">
                    <MobileButton
                      disabled={saveCertification.isPending}
                      onPress={submitCertification}
                    >
                      {saveCertification.isPending ? "Saving..." : "Save certification"}
                    </MobileButton>
                    <MobileButton variant="ghost" onPress={resetCertificationForm}>
                      Cancel
                    </MobileButton>
                  </View>
                </View>
              )}
            </View>
          </MobileSection>

          {status !== "verified" && status !== "pending" ? (
            <MobileSection title="Submit">
              <View className="gap-3 rounded-2xl border border-border bg-card p-4">
                <Pressable
                  accessibilityRole="checkbox"
                  className={`rounded-2xl border p-3 ${
                    attestationAccepted
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background"
                  }`}
                  onPress={() => setAttestationAccepted((value) => !value)}
                >
                  <Text className="text-sm leading-5 text-muted-foreground">
                    I attest that the submitted credentials are truthful and understand FPH verification is platform review only.
                  </Text>
                </Pressable>
                {message ? (
                  <Text className="text-sm text-muted-foreground">{message}</Text>
                ) : null}
                <MobileButton
                  disabled={saveProfile.isPending || submitProfile.isPending}
                  onPress={submitApplication}
                >
                  {submitProfile.isPending ? "Submitting..." : "Submit application"}
                </MobileButton>
              </View>
            </MobileSection>
          ) : message ? (
            <MobileSection title="Updates">
              <Text className="text-sm text-muted-foreground">{message}</Text>
            </MobileSection>
          ) : null}
        </>
      ) : null}
    </MobileScrollScreen>
  );
}
