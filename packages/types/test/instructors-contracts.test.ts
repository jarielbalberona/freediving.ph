import assert from "node:assert/strict";
import test from "node:test";
import type {
  InstructorAgency,
  InstructorApplication,
  InstructorCertificationProofUrlResponse,
  InstructorCertificationVerificationStatus,
  InstructorVerificationStatus,
  ViewerInstructorStatus,
} from "../src/index";

test("instructors shared contracts expose v1 enum values", () => {
  const status: InstructorVerificationStatus = "verified";
  const certificationStatus: InstructorCertificationVerificationStatus =
    "pending";
  const agency: InstructorAgency = "apnea_academy";
  const viewer: ViewerInstructorStatus = {
    status: "none",
    canCreateSchool: false,
    message: "School creation is available for verified instructors.",
    rejectionReason: "",
  };

  assert.equal(status, "verified");
  assert.equal(certificationStatus, "pending");
  assert.equal(agency, "apnea_academy");
  assert.equal(viewer.canCreateSchool, false);
});

test("instructor application keeps private status out of public badge logic", () => {
  const application: InstructorApplication = {
    profile: {
      id: "profile-1",
      userId: "user-1",
      username: "buddy",
      displayName: "Buddy Instructor",
      bio: "",
      teachingSince: "",
      homeLocationLabel: "Cebu",
      formattedAddress: "Cebu City, Cebu",
      regionCode: "07",
      regionName: "Central Visayas",
      provinceCode: "0722",
      provinceName: "Cebu",
      cityCode: "072217",
      cityName: "Cebu City",
      barangayCode: "",
      barangayName: "",
      locationSource: "psgc_mapped",
      specialties: "depth training",
      schoolAffiliation: "Cebu Freedive",
      websiteUrl: "https://example.com",
      socialLinks: "https://instagram.com/buddy",
      safetyCredentials: "First aid",
      verificationStatus: "verified",
      verifiedAt: "2026-05-24T00:00:00Z",
      attestationAcceptedAt: "2026-05-24T00:00:00Z",
      createdAt: "2026-05-24T00:00:00Z",
      updatedAt: "2026-05-24T00:00:00Z",
    },
    certifications: [
      {
        id: "cert-1",
        instructorProfileId: "profile-1",
        agency: "padi",
        agencyOtherName: "",
        certificationLevel: "Freediver Instructor",
        certificationNumber: "",
        issuedAt: "",
        expiresAt: "",
        officialVerificationUrl: "https://verify.example.com/member/123",
        verificationStatus: "verified",
        verifiedAt: "2026-05-24T00:00:00Z",
        createdAt: "2026-05-24T00:00:00Z",
        updatedAt: "2026-05-24T00:00:00Z",
      },
    ],
    viewerInstructorStatus: {
      status: "verified",
      canCreateSchool: true,
      message:
        "You are verified as an instructor. You can now create and manage schools.",
      rejectionReason: "",
    },
  };

  assert.equal(application.profile?.verificationStatus, "verified");
  assert.equal(application.profile?.cityName, "Cebu City");
  assert.equal(application.certifications[0]?.agency, "padi");
  assert.equal(application.viewerInstructorStatus.canCreateSchool, true);
});

test("instructor certification proof URL response is scoped under proof", () => {
  const response: InstructorCertificationProofUrlResponse = {
    proof: {
      certificationId: "cert-1",
      proofMediaId: "media-1",
      proofFileName: "credential.png",
      proofContentType: "image/png",
      url: "https://cdn.example.com/instructors/user-1/credential.png",
      expiresAt: 1_779_552_000,
    },
  };

  assert.equal(response.proof.proofFileName, "credential.png");
});
