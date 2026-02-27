export type ReportTargetType = "user" | "message" | "chika_thread" | "chika_comment";

export type ReportReasonCode = "spam" | "harassment" | "impersonation" | "unsafe" | "other";

export type ReportStatus = "open" | "reviewing" | "resolved" | "rejected";

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
  eventType: "created" | "status_changed" | "note_added";
  fromStatus?: ReportStatus;
  toStatus?: ReportStatus;
  note?: string;
  createdAt: string;
}

export interface ReportDetail {
  report: ReportListItem;
  events: ReportEvent[];
}
