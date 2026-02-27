import type { ApiErrorEnvelope } from "./api/error";

export type ReportTargetType = "user" | "message" | "chika_thread" | "chika_comment";

export type ReportReasonCode = "spam" | "harassment" | "impersonation" | "unsafe" | "other";

export type ReportStatus = "open" | "reviewing" | "resolved" | "rejected";

export type ReportEventType = "created" | "status_changed" | "note_added";

export interface CreateReportRequest {
  targetType: ReportTargetType;
  targetId: string;
  reasonCode: ReportReasonCode;
  details?: string;
  evidenceUrls?: string[];
}

export interface CreateReportResponse {
  id: string;
  status: ReportStatus;
}

export interface ReportListItem {
  id: string;
  reporterUserId: string;
  targetType: ReportTargetType;
  targetId: string;
  targetAppUserId?: string;
  reasonCode: ReportReasonCode;
  details?: string;
  evidenceUrls?: string[];
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ReportEvent {
  id: string;
  reportId: string;
  actorUserId: string;
  eventType: ReportEventType;
  fromStatus?: ReportStatus;
  toStatus?: ReportStatus;
  note?: string;
  createdAt: string;
}

export interface ReportDetail {
  report: ReportListItem;
  events: ReportEvent[];
}

export interface ListReportsQuery {
  status?: ReportStatus;
  targetType?: ReportTargetType;
  reporterUserId?: string;
  createdFrom?: string;
  createdTo?: string;
  limit?: number;
  cursor?: string;
}

export interface ListReportsResponse {
  items: ReportListItem[];
  nextCursor?: string;
}

export type GetReportDetailResponse = ReportDetail;

export interface UpdateReportStatusRequest {
  status: Exclude<ReportStatus, "open">;
  note?: string;
}

export interface UpdateReportStatusResponse {
  report: ReportListItem;
  latestEvent?: ReportEvent;
}

export type ReportsApiError = ApiErrorEnvelope;

export interface ModerationActionRequest {
  reason: string;
  reportId?: string;
}

export interface ModerationActionRecord {
  id: string;
  actorUserId: string;
  targetType: "user" | "chika_thread" | "chika_comment";
  targetId: string;
  action: string;
  reason: string;
  reportId?: string;
  createdAt: string;
}

export interface ModerationActionResponse {
  action: ModerationActionRecord;
}
