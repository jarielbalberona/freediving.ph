import type {
  AdminInstructorsResponse,
  AdminListParams,
  InstructorAdminReviewPayload,
  InstructorApplicationPayload,
  InstructorApplicationResponse,
  InstructorCertificationPayload,
  InstructorCertificationProofUrlResponse,
  InstructorCertificationResponse,
  InstructorSubmitPayload,
} from "@freediving.ph/types";

import { fphgoFetchClient } from "@/lib/api/fphgo-fetch-client";
import { routes } from "@/lib/api/fphgo-routes";

const withQuery = (
  path: string,
  params: AdminListParams & { status?: string } = {},
) => {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  if (params.status) search.set("status", params.status);
  const query = search.toString();
  return query ? `${path}?${query}` : path;
};

export const instructorsApi = {
  getMe: () =>
    fphgoFetchClient<InstructorApplicationResponse>(routes.v1.instructors.me()),

  saveMe: (data: InstructorApplicationPayload) =>
    fphgoFetchClient<InstructorApplicationResponse>(
      routes.v1.instructors.me(),
      {
        method: "PATCH",
        body: { ...data },
      },
    ),

  submitMe: (data: InstructorSubmitPayload) =>
    fphgoFetchClient<InstructorApplicationResponse>(
      routes.v1.instructors.submitMe(),
      { method: "POST", body: { ...data } },
    ),

  createCertification: (data: InstructorCertificationPayload) =>
    fphgoFetchClient<InstructorCertificationResponse>(
      routes.v1.instructors.certifications(),
      { method: "POST", body: { ...data } },
    ),

  updateCertification: (
    certificationId: string,
    data: InstructorCertificationPayload,
  ) =>
    fphgoFetchClient<InstructorCertificationResponse>(
      routes.v1.instructors.certification(certificationId),
      { method: "PATCH", body: { ...data } },
    ),

  deleteCertification: (certificationId: string) =>
    fphgoFetchClient<void>(
      routes.v1.instructors.certification(certificationId),
      {
        method: "DELETE",
      },
    ),

  getMyCertificationProofUrl: (certificationId: string) =>
    fphgoFetchClient<InstructorCertificationProofUrlResponse>(
      routes.v1.instructors.certificationProof(certificationId),
    ),

  getPublicInstructor: (username: string) =>
    fphgoFetchClient<InstructorApplicationResponse>(
      routes.v1.instructors.byUsername(username),
      { auth: "ready-only" },
    ),

  listAdminInstructors: (params: AdminListParams & { status?: string } = {}) =>
    fphgoFetchClient<AdminInstructorsResponse>(
      withQuery(routes.v1.admin.instructors(), params),
    ),

  getAdminInstructor: (instructorId: string) =>
    fphgoFetchClient<InstructorApplicationResponse>(
      routes.v1.admin.instructor(instructorId),
    ),

  getAdminCertificationProofUrl: (
    instructorId: string,
    certificationId: string,
  ) =>
    fphgoFetchClient<InstructorCertificationProofUrlResponse>(
      routes.v1.admin.instructorCertificationProof(
        instructorId,
        certificationId,
      ),
    ),

  verifyAdminInstructor: (instructorId: string) =>
    fphgoFetchClient<InstructorApplicationResponse>(
      routes.v1.admin.verifyInstructor(instructorId),
      { method: "POST" },
    ),

  rejectAdminInstructor: (
    instructorId: string,
    data: InstructorAdminReviewPayload,
  ) =>
    fphgoFetchClient<InstructorApplicationResponse>(
      routes.v1.admin.rejectInstructor(instructorId),
      { method: "POST", body: { ...data } },
    ),

  suspendAdminInstructor: (
    instructorId: string,
    data: InstructorAdminReviewPayload,
  ) =>
    fphgoFetchClient<InstructorApplicationResponse>(
      routes.v1.admin.suspendInstructor(instructorId),
      { method: "POST", body: { ...data } },
    ),
};
