import type {
  InstructorApplicationPayload,
  InstructorApplicationResponse,
  InstructorCertificationPayload,
  InstructorCertificationProofUrlResponse,
  InstructorCertificationResponse,
  InstructorSubmitPayload,
} from "@freediving.ph/types";

import { fphgoFetch } from "@/lib/api";

export const getMyInstructorApplication = (authToken: string) =>
  fphgoFetch<InstructorApplicationResponse>("/v1/instructors/me", {
    auth: "required",
    authToken,
  });

export const saveMyInstructorProfile = (
  payload: InstructorApplicationPayload,
  authToken: string,
) =>
  fphgoFetch<InstructorApplicationResponse>("/v1/instructors/me", {
    auth: "required",
    authToken,
    body: payload,
    method: "PATCH",
  });

export const submitMyInstructorProfile = (
  payload: InstructorSubmitPayload,
  authToken: string,
) =>
  fphgoFetch<InstructorApplicationResponse>("/v1/instructors/me/submit", {
    auth: "required",
    authToken,
    body: payload,
    method: "POST",
  });

export const createInstructorCertification = (
  payload: InstructorCertificationPayload,
  authToken: string,
) =>
  fphgoFetch<InstructorCertificationResponse>(
    "/v1/instructors/me/certifications",
    {
      auth: "required",
      authToken,
      body: payload,
      method: "POST",
    },
  );

export const updateInstructorCertification = (
  certificationId: string,
  payload: InstructorCertificationPayload,
  authToken: string,
) =>
  fphgoFetch<InstructorCertificationResponse>(
    `/v1/instructors/me/certifications/${encodeURIComponent(certificationId)}`,
    {
      auth: "required",
      authToken,
      body: payload,
      method: "PATCH",
    },
  );

export const deleteInstructorCertification = (
  certificationId: string,
  authToken: string,
) =>
  fphgoFetch<void>(
    `/v1/instructors/me/certifications/${encodeURIComponent(certificationId)}`,
    { auth: "required", authToken, method: "DELETE" },
  );

export const getMyInstructorCertificationProofUrl = (
  certificationId: string,
  authToken: string,
) =>
  fphgoFetch<InstructorCertificationProofUrlResponse>(
    `/v1/instructors/me/certifications/${encodeURIComponent(certificationId)}/proof-url`,
    { auth: "required", authToken },
  );

export const getPublicInstructor = (username: string) =>
  fphgoFetch<InstructorApplicationResponse>(
    `/v1/instructors/${encodeURIComponent(username)}`,
    { auth: "none" },
  );
