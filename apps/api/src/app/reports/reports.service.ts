import { and, desc, eq } from "drizzle-orm";

import DrizzleService from "@/databases/drizzle/service";
import { users } from "@/models/drizzle/authentication.model";
import { auditLogs, reports } from "@/models/drizzle/moderation.model";
import { ServiceResponse, type ServiceApiResponse } from "@/utils/serviceApi";
import { status } from "@/utils/statusCodes";

import type {
  CreateReportSchemaType,
  ReportQuerySchemaType,
  UpdateReportStatusSchemaType,
} from "./reports.validators";

export default class ReportsService extends DrizzleService {
  async create(currentUserId: number, payload: CreateReportSchemaType) {
    try {
      const createdRows = await this.db
        .insert(reports)
        .values({
          reporterUserId: currentUserId,
          targetType: payload.targetType,
          targetId: payload.targetId,
          reasonCode: payload.reasonCode,
          text: payload.text,
          status: "OPEN",
        })
        .returning();

      const created = createdRows[0];
      if (!created) {
        return ServiceResponse.createRejectResponse(status.HTTP_500_INTERNAL_SERVER_ERROR, "Failed to create report");
      }

      return ServiceResponse.createResponse(status.HTTP_201_CREATED, "Report submitted successfully", created);
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }

  async list(query: ReportQuerySchemaType): Promise<ServiceApiResponse<unknown[]>> {
    try {
      const conditions = [];

      if (query.status) {
        conditions.push(eq(reports.status, query.status));
      }

      if (query.targetType) {
        conditions.push(eq(reports.targetType, query.targetType));
      }

      if (query.reasonCode) {
        conditions.push(eq(reports.reasonCode, query.reasonCode));
      }

      const rows = await this.db
        .select({
          id: reports.id,
          targetType: reports.targetType,
          targetId: reports.targetId,
          reasonCode: reports.reasonCode,
          text: reports.text,
          status: reports.status,
          reviewedAt: reports.reviewedAt,
          resolutionNote: reports.resolutionNote,
          createdAt: reports.createdAt,
          reporter: {
            id: users.id,
            username: users.username,
            alias: users.alias,
          },
        })
        .from(reports)
        .leftJoin(users, eq(reports.reporterUserId, users.id))
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(reports.createdAt))
        .limit(query.limit)
        .offset(query.offset);

      return ServiceResponse.createResponse(status.HTTP_200_OK, "Reports retrieved successfully", rows);
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }

  async updateStatus(currentUserId: number, reportId: number, payload: UpdateReportStatusSchemaType) {
    try {
      const updatedRows = await this.db
        .update(reports)
        .set({
          status: payload.status,
          resolutionNote: payload.resolutionNote,
          reviewedByUserId: currentUserId,
          reviewedAt: new Date(),
        })
        .where(eq(reports.id, reportId))
        .returning();

      const updated = updatedRows[0];
      if (!updated) {
        return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Report not found");
      }

      await this.db.insert(auditLogs).values({
        actorUserId: currentUserId,
        action: "REPORT_STATUS_UPDATED",
        targetType: "REPORT",
        targetId: String(reportId),
        metadata: {
          newStatus: payload.status,
        },
      });

      return ServiceResponse.createResponse(status.HTTP_200_OK, "Report status updated", updated);
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }
}
